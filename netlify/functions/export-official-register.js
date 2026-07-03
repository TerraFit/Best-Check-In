// netlify/functions/export-official-register.js
// ✅ FIXED: Actually generates a real PDF file

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pdf from 'html-pdf';  // ← Add this

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
    // ✅ FIX: Create Supabase client with WebSocket transport
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          transport: WebSocket
        }
      }
    );

    const { businessId, request, authorization } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    // ... (Step 1-6: Same as before - validation, fetching data, etc.)

    // ⚡ SKIP: Instead of returning HTML directly, generate a real PDF

    // ✅ STEP 7: Generate HTML content
    const htmlContent = generateHTML(exportData, business, request, userName);

    // ✅ STEP 8: Convert HTML to PDF
    const pdfBuffer = await new Promise((resolve, reject) => {
      pdf.create(htmlContent, {
        format: 'A4',
        border: {
          top: '1.5cm',
          bottom: '1.5cm',
          left: '1cm',
          right: '1cm'
        },
        printBackground: true,
        zoomFactor: 1
      }).toBuffer((err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    const filename = `official-register-${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    // ✅ STEP 9: Create audit record
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    // ... (rest of audit record creation)

    // ✅ STEP 10: Return actual PDF
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true  // ← CRITICAL for binary data
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
// ✅ HTML GENERATION (Same as before, but now as a function)
// ============================================================
function generateHTML(data, business, request, userName) {
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
    
    @page {
      margin: 1.5cm 1cm;
      size: A4 portrait;
    }
  </style>
</head>
<body>
  <div class="watermark-bg">CONFIDENTIAL</div>

  <div class="content">
    <div class="header">
      <h1>📋 Official Guest Register</h1>
      <div class="subtitle">Statutory Guest Record — Immigration Act Section 40</div>
      <div class="ref">Reference: FAST-${business.id.substring(0, 8).toUpperCase()}-${date.replace(/-/g, '')}</div>
    </div>

    <div class="watermark-banner">
      <div class="warning">⚠️ CONFIDENTIAL — PROTECTED PERSONAL INFORMATION</div>
      <div class="text">This document contains personal information protected under POPIA. Unauthorised disclosure may constitute an offence.</div>
    </div>

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
</body>
</html>
  `;
}
