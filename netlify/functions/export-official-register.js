// netlify/functions/export-official-register.js
// PDF ONLY - Professional watermark, no CSV or XLSX
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
      process.env.SUPABASE_SERVICE_KEY
    );

    const { businessId, request, authorization } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    // ✅ STEP 1: Validate authorization - Password verification is MANDATORY
    if (!authorization?.password || !authorization?.acceptTerms) {
      return { statusCode: 401, headers, body: JSON.stringify({ 
        error: 'Authorization required',
        details: 'Password and terms acceptance are required for sensitive data export'
      })};
    }

    // ✅ STEP 2: Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, trading_name, email, password_hash')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    // ✅ STEP 3: Verify password against stored hash (MANDATORY)
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

    // ✅ STEP 4: Verify password (bcrypt comparison) - MANDATORY
    const isPasswordValid = await bcrypt.compare(authorization.password, business.password_hash);
    if (!isPasswordValid) {
      return { statusCode: 401, headers, body: JSON.stringify({ 
        error: 'Invalid password',
        details: 'The password you entered is incorrect. Please try again.'
      })};
    }

    // ✅ STEP 5: Build query
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId);

    if (request?.dateFrom) {
      query = query.gte('check_in_date', request.dateFrom);
    }
    if (request?.dateTo) {
      query = query.lte('check_in_date', request.dateTo);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    // ✅ STEP 6: Transform data for export
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

    // ✅ STEP 7: Generate PDF
    const pdfContent = generatePDF(exportData, business, request, userName);
    const filename = `official-register-${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    // ✅ STEP 8: Create audit record
    const fileHash = crypto.createHash('sha256').update(pdfContent).digest('hex');
    const auditRecord = {
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
    };

    await supabase
      .from('sensitive_export_audit')
      .insert(auditRecord);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: pdfContent
    };

  } catch (error) {
    console.error('Export error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Export failed', 
        details: error.message 
      })
    };
  }
};

// ============================================================
// ✅ PROFESSIONAL PDF GENERATION WITH WATERMARK
// ============================================================
function generatePDF(data, business, request, userName) {
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Official Guest Register - ${business.trading_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica', Arial, sans-serif; 
      padding: 40px;
      font-size: 10px;
      color: #1a1a1a;
      background: white;
    }
    
    /* ============================================================
       WATERMARK - Background watermark on every page
       ============================================================ */
    .watermark-bg {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.06);
      letter-spacing: 8px;
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      width: 100%;
      text-align: center;
    }
    
    .content {
      position: relative;
      z-index: 1;
    }
    
    /* ============================================================
       HEADER
       ============================================================ */
    .header { 
      border-bottom: 3px solid #f59e0b; 
      padding-bottom: 15px; 
      margin-bottom: 20px;
    }
    .header h1 { 
      font-size: 24px; 
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .header .subtitle { 
      font-size: 13px; 
      color: #6b7280;
    }
    .header .ref { 
      font-size: 10px; 
      color: #9ca3af;
      margin-top: 4px;
    }
    
    /* ============================================================
       WATERMARK BANNER - Top of page
       ============================================================ */
    .watermark-banner { 
      background: #fef3c7; 
      border-left: 6px solid #dc2626; 
      padding: 12px 18px; 
      margin: 15px 0 20px 0;
      border-radius: 4px;
    }
    .watermark-banner .warning { 
      color: #dc2626; 
      font-weight: 700;
      font-size: 14px;
    }
    .watermark-banner .text { 
      font-size: 11px; 
      color: #92400e;
      margin-top: 2px;
    }
    
    /* ============================================================
       METADATA
       ============================================================ */
    .metadata {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 3px 20px;
      background: #f9fafb;
      padding: 14px 18px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 10px;
      border: 1px solid #e5e7eb;
    }
    .metadata .label { color: #6b7280; font-weight: 500; }
    .metadata .value { font-weight: 600; color: #1a1a1a; }
    
    /* ============================================================
       TABLE
       ============================================================ */
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      font-size: 8.5px;
    }
    th { 
      background: #f3f4f6; 
      text-align: left; 
      padding: 6px 5px; 
      border: 1px solid #d1d5db;
      font-weight: 700;
      white-space: nowrap;
      color: #1a1a1a;
    }
    td { 
      padding: 5px 5px; 
      border: 1px solid #d1d5db;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
      color: #1a1a1a;
    }
    tr:nth-child(even) { background: #fafafa; }
    
    /* ============================================================
       FOOTER - Watermark warning at bottom
       ============================================================ */
    .footer { 
      margin-top: 30px; 
      padding-top: 15px;
      border-top: 2px solid #dc2626;
      font-size: 9px;
      color: #6b7280;
      text-align: center;
    }
    .footer .warning-text {
      color: #dc2626;
      font-weight: 700;
      font-size: 11px;
    }
    .footer .case-info {
      margin-top: 6px;
      font-size: 9px;
      color: #6b7280;
    }
    
    /* ============================================================
       PRINT STYLES
       ============================================================ */
    @media print {
      body { padding: 20px; margin: 0; }
      .no-print { display: none; }
      .watermark-bg { 
        color: rgba(220, 38, 38, 0.08); 
        font-size: 100px;
      }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
    }
    
    /* ============================================================
       PAGE BREAK HANDLING
       ============================================================ */
    @page {
      margin: 1.5cm 1cm;
      size: A4 portrait;
    }
  </style>
</head>
<body>
  <!-- ============================================================
       BACKGROUND WATERMARK - Visible on every page
       ============================================================ -->
  <div class="watermark-bg">CONFIDENTIAL</div>

  <div class="content">
    <!-- HEADER -->
    <div class="header">
      <h1>📋 Official Guest Register</h1>
      <div class="subtitle">Statutory Guest Record — Immigration Act Section 40</div>
      <div class="ref">Reference: FAST-${business.id.substring(0, 8).toUpperCase()}-${date.replace(/-/g, '')}</div>
    </div>

    <!-- WATERMARK BANNER -->
    <div class="watermark-banner">
      <div class="warning">⚠️ CONFIDENTIAL — PROTECTED PERSONAL INFORMATION</div>
      <div class="text">This document contains personal information protected under POPIA (Protection of Personal Information Act). Unauthorised disclosure may constitute an offence.</div>
    </div>

    <!-- METADATA -->
    <div class="metadata">
      <div><span class="label">Business:</span> <span class="value">${business.trading_name}</span></div>
      <div><span class="label">Exported By:</span> <span class="value">${userName}</span></div>
      <div><span class="label">Date:</span> <span class="value">${exportTime}</span></div>
      <div><span class="label">Reason:</span> <span class="value">${reasonLabels[request?.reason] || request?.reason || 'Not specified'}</span></div>
      ${request?.caseNumber ? `<div><span class="label">Case Number:</span> <span class="value">${request.caseNumber}</span></div>` : ''}
      ${request?.authorityName ? `<div><span class="label">Authority:</span> <span class="value">${request.authorityName}</span></div>` : ''}
      ${request?.officerName ? `<div><span class="label">Officer:</span> <span class="value">${request.officerName}</span></div>` : ''}
      <div><span class="label">Records:</span> <span class="value">${data.length} guest records</span></div>
      ${request?.referenceNumber ? `<div><span class="label">Reference:</span> <span class="value">${request.referenceNumber}</span></div>` : ''}
    </div>

    <!-- DATA TABLE -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Full Name</th>
          <th>Nationality</th>
          <th>ID/Passport</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Check-in</th>
          <th>Check-out</th>
          <th>From</th>
          <th>To</th>
          <th>Room</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((row, index) => `
          <tr>
            <td style="text-align:center;">${index + 1}</td>
            <td>${row['Full Name']}</td>
            <td>${row['Nationality']}</td>
            <td>${row['ID Number']}</td>
            <td>${row['Email']}</td>
            <td>${row['Phone']}</td>
            <td>${row['Check-in Date']}</td>
            <td>${row['Check-out Date']}</td>
            <td>${row['Arriving From']}</td>
            <td>${row['Going To']}</td>
            <td>${row['Room Number']}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- FOOTER WITH WATERMARK WARNING -->
    <div class="footer">
      <div class="warning-text">⚠️ CONFIDENTIAL — This file contains personal information protected under POPIA</div>
      <div class="case-info">
        Business: ${business.trading_name} • Exported: ${exportTime} • ${data.length} records • FastCheckin
        ${request?.caseNumber ? `• Case: ${request.caseNumber}` : ''}
      </div>
      <div style="margin-top: 8px; font-size: 8px; color: #9ca3af;">
        © ${new Date().getFullYear()} FastCheckin. All rights reserved. | www.fastcheckin.co.za
      </div>
    </div>
  </div>

  <script>
    // Auto-print when loaded (for PDF generation)
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
}
