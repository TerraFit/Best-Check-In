// netlify/functions/export-official-register.js
// Programme 1: backend feature gate for official_register_export (Pro+)

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { assertFeatureAccess } from './lib/featureAccess.js';

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

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { realtime: { transport: WebSocket } }
    );

    const { businessId, request, authorization } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    // Programme 1 — authoritative package check (fail closed, Pro+)
    const denied = await assertFeatureAccess(supabase, businessId, 'official_register_export');
    if (denied) {
      return { statusCode: denied.statusCode, headers, body: JSON.stringify(denied.body) };
    }

    if (!authorization?.password || !authorization?.acceptTerms) {
      return { statusCode: 401, headers, body: JSON.stringify({
        error: 'Authorization required',
        details: 'Password and terms acceptance are required for sensitive data export'
      })};
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, trading_name, email, password_hash')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    let userRole = 'owner';
    let userId = 'unknown';
    let userName = 'Unknown User';

    const authHeader = event.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        userId = decoded.sub || 'unknown';
        userName = decoded.user_metadata?.name || decoded.user_metadata?.business_name || 'Unknown User';
        userRole = decoded.user_metadata?.role || 'owner';
      } catch (e) {
        console.warn('Could not verify JWT:', e.message);
      }
    }

    const isPasswordValid = await bcrypt.compare(authorization.password, business.password_hash);
    if (!isPasswordValid) {
      return { statusCode: 401, headers, body: JSON.stringify({
        error: 'Invalid password',
        details: 'The password you entered is incorrect. Please try again.'
      })};
    }

    let query = supabase.from('bookings').select('*').eq('business_id', businessId);
    if (request?.dateFrom) query = query.gte('check_in_date', request.dateFrom);
    if (request?.dateTo) query = query.lte('check_in_date', request.dateTo);

    const { data: bookings, error } = await query;
    if (error) throw error;

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
    const filename = `official-register-${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;

    const fileHash = crypto.createHash('sha256').update(htmlContent).digest('hex');
    await supabase.from('sensitive_export_audit').insert({
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
      ip_address: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
      user_agent: event.headers['user-agent'] || 'unknown',
      emergency_access: false,
      previous_hash: null,
      current_hash: fileHash
    });

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
    console.error('Export error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Export failed', details: error.message })
    };
  }
};

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

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Official Guest Register - ${business.trading_name}</title>
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
<div>Reference: FAST-${business.id.substring(0, 8).toUpperCase()}-${date.replace(/-/g, '')}</div></div>
<div class="watermark-banner"><div class="warning">CONFIDENTIAL — PROTECTED PERSONAL INFORMATION</div>
<div>This document contains personal information protected under POPIA.</div></div>
<p><strong>Business:</strong> ${business.trading_name} · <strong>Exported By:</strong> ${userName} · <strong>Date:</strong> ${exportTime}</p>
<p><strong>Reason:</strong> ${reasonLabels[request?.reason] || request?.reason || 'Not specified'} · <strong>Records:</strong> ${data.length}</p>
<table><thead><tr><th>#</th><th>Full Name</th><th>Nationality</th><th>ID/Passport</th><th>Email</th><th>Phone</th><th>Check-in</th><th>Check-out</th><th>From</th><th>To</th><th>Room</th></tr></thead>
<tbody>${data.map((row, index) => `<tr><td>${index + 1}</td><td>${row['Full Name']}</td><td>${row['Nationality']}</td><td>${row['ID Number']}</td><td>${row['Email']}</td><td>${row['Phone']}</td><td>${row['Check-in Date']}</td><td>${row['Check-out Date']}</td><td>${row['Arriving From']}</td><td>${row['Going To']}</td><td>${row['Room Number']}</td></tr>`).join('')}</tbody></table>
<div class="footer"><div>CONFIDENTIAL — POPIA protected · FastCheckin · ${exportTime}</div></div>
<script>(function(){function openPrint(){try{window.print()}catch(e){}}openPrint();setTimeout(openPrint,500);})();</script>
</body></html>`;
}
