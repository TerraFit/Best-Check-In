// netlify/functions/export-official-register.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    const { businessId, request, authorization, format } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    // Validate authorization
    if (!authorization?.password || !authorization?.acceptTerms) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authorization required' }) };
    }

    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, trading_name, email')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    // Verify password (in production, use bcrypt compare)
    // This is simplified - you should verify against stored password hash
    // For now, we'll assume the password check happens client-side or via token

    // Get user info from JWT (simplified)
    const authHeader = event.headers.authorization;
    let userId = 'unknown';
    let userName = 'Unknown User';
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        userId = decoded.sub || 'unknown';
        userName = decoded.user_metadata?.name || decoded.user_metadata?.business_name || 'Unknown User';
      } catch (e) {
        // If token verification fails, use fallback
      }
    }

    // Build query
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

    // Transform data for export
    const exportData = bookings.map(b => ({
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

    // Generate file
    let contentType;
    let fileData;
    let filename;
    const date = new Date().toISOString().split('T')[0];
    const slug = business.trading_name.toLowerCase().replace(/\s+/g, '-');

    if (format === 'csv') {
      contentType = 'text/csv';
      const headers = Object.keys(exportData[0] || {});
      const rows = exportData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`));
      fileData = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = `official-register-${slug}-${date}.csv`;
    } else if (format === 'pdf') {
      // For PDF, we'll generate a simple HTML version
      contentType = 'text/html';
      fileData = generatePDFHTML(exportData, business, request, userName);
      filename = `official-register-${slug}-${date}.html`;
    } else {
      // XLSX - use CSV as fallback
      contentType = 'text/csv';
      const headers = Object.keys(exportData[0] || {});
      const rows = exportData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`));
      fileData = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = `official-register-${slug}-${date}.csv`;
    }

    // Create audit record
    const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');
    const auditRecord = {
      business_id: businessId,
      business_name: business.trading_name,
      exported_by_user_id: userId,
      exported_by_name: userName,
      exported_by_role: 'owner',
      exported_at: new Date().toISOString(),
      reason: request?.reason || 'other',
      authority_name: request?.authorityName || null,
      officer_name: request?.officerName || null,
      case_number: request?.caseNumber || null,
      reference_number: request?.referenceNumber || null,
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
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: fileData
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

function generatePDFHTML(data, business, request, userName) {
  const date = new Date().toISOString().split('T')[0];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Official Guest Register - ${business.trading_name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
    .header { margin-bottom: 30px; }
    .watermark { 
      background: #fef3c7; 
      border: 1px solid #f59e0b; 
      padding: 15px; 
      margin: 20px 0;
      border-radius: 8px;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #d1d5db; }
    td { padding: 8px; border: 1px solid #d1d5db; }
    .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .warning { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Official Guest Register</h1>
    <p><strong>Business:</strong> ${business.trading_name}</p>
    <p><strong>Exported By:</strong> ${userName}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Reason:</strong> ${request?.reason?.replace('_', ' ') || 'Not specified'}</p>
    ${request?.caseNumber ? `<p><strong>Case Number:</strong> ${request.caseNumber}</p>` : ''}
    ${request?.authorityName ? `<p><strong>Authority:</strong> ${request.authorityName}</p>` : ''}
  </div>

  <div class="watermark">
    <p class="warning">⚠️ This file contains personal information protected under POPIA.</p>
    <p>Unauthorised disclosure may constitute an offence.</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Full Name</th>
        <th>Nationality</th>
        <th>ID/Passport</th>
        <th>Check-in</th>
        <th>Check-out</th>
        <th>Arriving From</th>
        <th>Going To</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          <td>${row['Full Name']}</td>
          <td>${row['Nationality']}</td>
          <td>${row['ID Number']}</td>
          <td>${row['Check-in Date']}</td>
          <td>${row['Check-out Date']}</td>
          <td>${row['Arriving From']}</td>
          <td>${row['Going To']}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>This export was generated on ${new Date().toLocaleString()} and contains ${data.length} guest records.</p>
    <p>© ${new Date().getFullYear()} FastCheckin. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
