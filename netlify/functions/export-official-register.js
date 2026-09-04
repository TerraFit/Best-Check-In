// netlify/functions/export-official-register.js
// Programme 1: backend feature gate for official_register_export (Pro+)
// P0: canonical JWT authentication and JWT-bound tenant scope.
// Official register is a sensitive export: business owners and SuperAdmins only.

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import auth from './_auth.cjs';
import { assertFeatureAccess } from './lib/featureAccess.js';

const { authenticateRequest, resolveTenant, authFailure } = auth;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  // This export contains ID/passport data and other statutory guest PII.
  // Do not allow ordinary employees or platform roles to reach the export.
  if (principal.actorType !== 'business' && principal.actorType !== 'super_admin') {
    return authFailure({ status: 403, error: 'Official register export requires business-owner authorization' }, headers);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Malformed JSON request' }) };
    }

    const { businessId: requestedBusinessId, request, authorization } = body;
    const scope = resolveTenant(principal, requestedBusinessId || undefined);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;

    if (!authorization?.password || authorization.acceptTerms !== true) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authorization required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const restHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };

    // Commercial entitlement is checked server-side, after actor and tenant scope.
    const denied = await assertFeatureAccess(null, businessId, 'official_register_export');
    if (denied) {
      return { statusCode: denied.statusCode, headers, body: JSON.stringify(denied.body) };
    }

    const businessRes = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,email,password_hash&limit=1`,
      { headers: restHeaders }
    );
    if (!businessRes.ok) {
      console.error('Official register business lookup failed:', businessRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Export authorization failed' }) };
    }
    const business = (await businessRes.json())[0];
    if (!business) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    const isPasswordValid = await bcrypt.compare(authorization.password, business.password_hash || '');
    if (!isPasswordValid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };
    }

    const userId = principal.actorType === 'super_admin' ? (principal.userId || 'super_admin') : (principal.userId || 'business_owner');
    const userRole = principal.actorType === 'super_admin' ? 'super_admin' : 'owner';
    const userName = principal.email || (principal.actorType === 'super_admin' ? 'Super Admin' : 'Business Owner');

    const queryParts = [
      `business_id=eq.${encodeURIComponent(businessId)}`,
      'select=*'
    ];
    if (request?.dateFrom) queryParts.push(`check_in_date=gte.${encodeURIComponent(request.dateFrom)}`);
    if (request?.dateTo) queryParts.push(`check_in_date=lte.${encodeURIComponent(request.dateTo)}`);

    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?${queryParts.join('&')}`,
      { headers: restHeaders }
    );
    if (!bookingsRes.ok) {
      console.error('Official register booking lookup failed:', bookingsRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Export failed' }) };
    }
    const bookings = await bookingsRes.json();

    const exportData = (bookings || []).map(b => ({
      'Full Name': b.guest_name || '',
      'First Name': b.guest_first_name || '',
      'Last Name': b.guest_last_name || '',
      'Nationality': b.guest_country || '',
      'ID Number': b.guest_id_number || '',
      'Passport Number': b.guest_id_number || '',
      'Email': b.guest_email || '',
      'Phone': b.guest_phone || '',
      'Address': b.guest_city || '',
      'Check-in Date': b.check_in_date || '',
      'Check-out Date': b.check_out_date || '',
      'Nights': b.nights || 0,
      'Arriving From': b.arriving_from || '',
      'Going To': b.next_destination || '',
      'Room Number': b.room_number || '',
      'Status': b.status || '',
      'Created At': b.created_at || ''
    }));

    const htmlContent = generateHTMLWithAutoPrint(exportData, business, request, userName);
    const safeBusinessName = String(business.trading_name || 'business').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'business';
    const filename = `official-register-${safeBusinessName}-${new Date().toISOString().split('T')[0]}.html`;

    const fileHash = crypto.createHash('sha256').update(htmlContent).digest('hex');
    const auditRes = await fetch(`${supabaseUrl}/rest/v1/sensitive_export_audit`, {
      method: 'POST',
      headers: { ...restHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        business_id: businessId,
        business_name: business.trading_name,
        exported_by_user_id: userId,
        exported_by_name: userName,
        exported_by_role: userRole,
        exported_at: new Date().toISOString(),
        reason: request?.reason || 'other',
        authority_name: request?.authorityName || null,
        officer_name: request?.officerName || null,
        case_number: request?.caseNumber || null,
        reference_number: request?.referenceNumber || null,
        notes: request?.notes || null,
        row_count: exportData.length,
        file_hash: fileHash,
        ip_address: event.headers?.['client-ip'] || event.headers?.['x-forwarded-for'] || 'unknown',
        user_agent: event.headers?.['user-agent'] || 'unknown',
        emergency_access: false,
        previous_hash: null,
        current_hash: fileHash
      })
    });
    if (!auditRes.ok) {
      console.error('Official register audit write failed:', auditRes.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Export audit failed' }) };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${filename}"`
      },
      body: htmlContent
    };
  } catch (error) {
    console.error('Export error:', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Export failed' })
    };
  }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHTMLWithAutoPrint(data, business, request, userName) {
  const date = new Date().toISOString().split('T')[0];
  const exportTime = new Date().toLocaleString();
  const reasonLabels = {
    police: 'Police Request',
    immigration: 'Immigration Request',
    court_order: 'Court Order',
    insurance: 'Insurance',
    internal_audit: 'Internal Audit',
    other: 'Other'
  };
  const safeBusinessId = escapeHtml(business.id);
  const safeBusinessName = escapeHtml(business.trading_name);
  const safeUserName = escapeHtml(userName);
  const safeReason = escapeHtml(reasonLabels[request?.reason] || request?.reason || 'Not specified');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Official Guest Register - ${safeBusinessName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;padding:40px;font-size:10px;color:#1a1a1a}
.header{border-bottom:3px solid #f59e0b;padding-bottom:15px;margin-bottom:20px}.header h1{font-size:24px}
.watermark-banner{background:#fef3c7;border-left:6px solid #dc2626;padding:12px 18px;margin:15px 0 20px;border-radius:4px}
.watermark-banner .warning{color:#dc2626;font-weight:700;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:15px;font-size:8.5px}
th{background:#f3f4f6;text-align:left;padding:6px 5px;border:1px solid #d1d5db}
td{padding:5px;border:1px solid #d1d5db;max-width:80px;overflow:hidden;text-overflow:ellipsis}
.footer{margin-top:30px;padding-top:15px;border-top:2px solid #dc2626;font-size:9px;color:#6b7280;text-align:center}
@media print{body{padding:20px}}</style></head><body>
<div class="header"><h1>Official Guest Register</h1>
<div>Statutory Guest Record — Immigration Act Section 40</div>
<div>Reference: FAST-${safeBusinessId.substring(0, 8).toUpperCase()}-${date.replace(/-/g, '')}</div></div>
<div class="watermark-banner"><div class="warning">CONFIDENTIAL — PROTECTED PERSONAL INFORMATION</div>
<div>This document contains personal information protected under POPIA.</div></div>
<p><strong>Business:</strong> ${safeBusinessName} · <strong>Exported By:</strong> ${safeUserName} · <strong>Date:</strong> ${escapeHtml(exportTime)}</p>
<p><strong>Reason:</strong> ${safeReason} · <strong>Records:</strong> ${data.length}</p>
<table><thead><tr><th>#</th><th>Full Name</th><th>Nationality</th><th>ID/Passport</th><th>Email</th><th>Phone</th><th>Check-in</th><th>Check-out</th><th>From</th><th>To</th><th>Room</th></tr></thead>
<tbody>${data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row['Full Name'])}</td><td>${escapeHtml(row['Nationality'])}</td><td>${escapeHtml(row['ID Number'])}</td><td>${escapeHtml(row['Email'])}</td><td>${escapeHtml(row['Phone'])}</td><td>${escapeHtml(row['Check-in Date'])}</td><td>${escapeHtml(row['Check-out Date'])}</td><td>${escapeHtml(row['Arriving From'])}</td><td>${escapeHtml(row['Going To'])}</td><td>${escapeHtml(row['Room Number'])}</td></tr>`).join('')}</tbody></table>
<div class="footer"><div>CONFIDENTIAL — POPIA protected · FastCheckin · ${escapeHtml(exportTime)}</div></div>
<script>(function(){function openPrint(){try{window.print()}catch(e){}}openPrint();setTimeout(openPrint,500);})();</script>
</body></html>`;
}
