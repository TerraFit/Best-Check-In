import auth from './_auth.cjs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { businessId, qrCodeUrl, checkInUrl } = body;
    const tenant = resolveTenant(actor.principal, businessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    if (typeof qrCodeUrl !== 'string' || !qrCodeUrl.startsWith('data:image/png;base64,')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid QR code image required' }) };
    }
    if (typeof checkInUrl !== 'string' || checkInUrl.length > 2048) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid check-in URL required' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: business, error } = await supabase.from('businesses').select('id,email,trading_name').eq('id', tenant.businessId).single();
    if (error || !business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'FastCheckin <onboarding@resend.dev>',
      to: [business.email],
      subject: `📱 Your Fastcheckin QR Code - ${business.trading_name}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1>FastCheckin</h1><p>Your QR Code is ready!</p><h2>${business.trading_name}</h2><div style="background:#f3f4f6;padding:30px;border-radius:8px;margin:30px 0;text-align:center"><img src="${qrCodeUrl}" alt="QR Code" style="max-width:200px;margin-bottom:20px"><p><strong>Scan for guest check-in</strong></p><p style="word-break:break-all">${checkInUrl}</p></div><p>Print this QR code and display it at your reception. Guests can scan it with their phone camera to access your check-in page.</p><p style="color:#777;font-size:14px;border-top:1px solid #ddd;padding-top:20px;text-align:center">Need help? Contact support@fastcheckin.co.za</p></div>`,
      attachments: [{ filename: `${business.trading_name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`, content: qrCodeUrl.split(',')[1], encoding: 'base64', contentType: 'image/png' }]
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'QR Code email sent successfully' }) };
  } catch (error) {
    console.error('Error sending QR email:', error);
    if (error instanceof SyntaxError) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    return { statusCode: 500, headers, body: JSON.stringify({ error: error?.message || 'Internal server error' }) };
  }
};
