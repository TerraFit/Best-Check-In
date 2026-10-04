import { supabaseInsert } from './lib/supabase-rest.js';

const PDF_HEADERS = {
  'Content-Type': 'application/pdf',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const JSON_HEADERS = { ...PDF_HEADERS, 'Content-Type': 'application/json' };

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);

async function verifyTurnstile(token, event) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not configured.');
    return { ok: false, error: 'CAPTCHA is temporarily unavailable. Please try again later.' };
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Please complete the CAPTCHA verification.' };
  }

  const remoteip = event?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || undefined;
  const payload = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteip) payload.set('remoteip', remoteip);
  if (process.env.TURNSTILE_SITE_KEY) payload.set('sitekey', process.env.TURNSTILE_SITE_KEY);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.warn('Turnstile verification failed:', result['error-codes'] || []);
      return { ok: false, error: 'CAPTCHA verification failed. Please try again.' };
    }
    return { ok: true };
  } catch (error) {
    console.error('Turnstile verification request failed:', error);
    return { ok: false, error: 'CAPTCHA verification is temporarily unavailable. Please try again.' };
  }
}

function validateLead(lead) {
  const fields = ['fullName', 'companyName', 'email', 'telephone', 'address'];
  if (!lead || fields.some((field) => !clean(lead[field]))) return 'Please complete all required fields.';
  if (!/^\S+@\S+\.\S+$/.test(clean(lead.email))) return 'Please enter a valid email address.';
  return null;
}

const escapeHtml = (value) => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

async function notifyLead(lead, document) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured; resource generated without email notification.');
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const documentLabel = document === 'brochure' ? 'FastCheckIn Brochure' : document === 'visitor-origin' ? 'Visitor Origin Explorer Snapshot' : 'Business Snapshot';
    const html = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn resource download</h2>' +
      '<p><strong>Resource:</strong> ' + documentLabel + '</p>' +
      '<p><strong>Name:</strong> ' + escapeHtml(lead.fullName) + '</p>' +
      '<p><strong>Company / hotel:</strong> ' + escapeHtml(lead.companyName) + '</p>' +
      '<p><strong>Email:</strong> ' + escapeHtml(lead.email) + '</p>' +
      '<p><strong>Telephone:</strong> ' + escapeHtml(lead.telephone) + '</p>' +
      '<p><strong>Address:</strong> ' + escapeHtml(lead.address) + '</p></div>';
    await resend.emails.send({
      from: 'FastCheckin <notifications@fastcheckin.co.za>',
      to: [process.env.FASTCHECKIN_INQUIRY_EMAIL || 'sales@fastcheckin.co.za'],
      subject: 'Homepage resource download: ' + documentLabel,
      html,
    });
  } catch (error) {
    console.error('Homepage lead notification failed:', error);
  }
}

async function notifyInquiry(lead, topic, comments) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured; inquiry cannot be notified by email.');
    return false;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn website enquiry</h2>' +
      '<p><strong>Topic:</strong> ' + escapeHtml(topic) + '</p>' +
      '<p><strong>Name:</strong> ' + escapeHtml(lead.fullName) + '</p>' +
      '<p><strong>Company / hotel:</strong> ' + escapeHtml(lead.companyName) + '</p>' +
      '<p><strong>Email:</strong> ' + escapeHtml(lead.email) + '</p>' +
      '<p><strong>Telephone:</strong> ' + escapeHtml(lead.telephone) + '</p>' +
      '<p><strong>Address:</strong> ' + escapeHtml(lead.address) + '</p>' +
      '<p><strong>Comments:</strong><br>' + escapeHtml(comments) + '</p></div>';
    await resend.emails.send({
      from: 'FastCheckin <notifications@fastcheckin.co.za>',
      to: [process.env.FASTCHECKIN_INQUIRY_EMAIL || 'sales@fastcheckin.co.za'],
      subject: 'FastCheckIn website enquiry: ' + clean(topic, 120),
      html,
    });
    return true;
  } catch (error) {
    console.error('Homepage enquiry notification failed:', error);
    return false;
  }
}

/** Static marketing PDFs in /public — same pattern as Platform Overview brochure */
const STATIC_DOCUMENTS = {
  brochure: '/FastCheckIn_Platform_Overview_Brochure.pdf',
  'visitor-origin': '/FastCheckIn_Visitor_Origin_Explorer_Snapshot.pdf',
  'business-snapshot': '/FastCheckIn_Business_Snapshot.pdf',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  if (body.action === 'inquiry') {
    const captcha = await verifyTurnstile(body.turnstileToken, event);
    if (!captcha.ok) return jsonResponse(400, { error: captcha.error });
    const leadError = validateLead(body.lead);
    if (leadError) return jsonResponse(400, { error: leadError });
    const topic = clean(body.topic, 160);
    const comments = clean(body.comments, 3000);
    if (!topic || !comments) return jsonResponse(400, { error: 'Please select a topic and enter your comments.' });
    const lead = {
      fullName: clean(body.lead.fullName),
      companyName: clean(body.lead.companyName),
      email: clean(body.lead.email, 320),
      telephone: clean(body.lead.telephone, 80),
      address: clean(body.lead.address),
    };
    try {
      const portfolio = body.portfolio && typeof body.portfolio === 'object' ? body.portfolio : {};
      await supabaseInsert('website_enquiries', {
        topic,
        status: 'new',
        full_name: lead.fullName,
        company_name: lead.companyName,
        email: lead.email,
        telephone: lead.telephone,
        address: lead.address,
        website: clean(portfolio.website, 500) || null,
        total_rooms: Number.isFinite(Number(portfolio.totalRooms)) ? Number(portfolio.totalRooms) : null,
        total_establishments: Number.isFinite(Number(portfolio.totalEstablishments)) ? Number(portfolio.totalEstablishments) : null,
        sa_establishments: Number.isFinite(Number(portfolio.saEstablishments)) ? Number(portfolio.saEstablishments) : null,
        sa_provinces: Array.isArray(portfolio.saProvinces) ? portfolio.saProvinces.map((v) => clean(v, 100)).filter(Boolean) : [],
        international_establishments: Number.isFinite(Number(portfolio.internationalEstablishments)) ? Number(portfolio.internationalEstablishments) : 0,
        international_countries: Array.isArray(portfolio.internationalCountries) ? portfolio.internationalCountries.map((v) => clean(v, 100)).filter(Boolean) : [],
        comments,
      });
    } catch (error) {
      console.error('Website enquiry persistence failed:', error);
      return jsonResponse(500, { error: 'Unable to save your enquiry. Please try again.' });
    }
    const notified = await notifyInquiry(lead, topic, comments);
    return jsonResponse(200, { success: true });
  }

  if (body.action !== 'download') return jsonResponse(400, { error: 'Unsupported action' });
  const document = ['brochure', 'visitor-origin', 'business-snapshot'].includes(body.document) ? body.document : null;
  if (!document) return jsonResponse(400, { error: 'Unsupported document' });

  const captcha = await verifyTurnstile(body.turnstileToken, event);
  if (!captcha.ok) return jsonResponse(400, { error: captcha.error });

  const leadError = validateLead(body.lead);
  if (leadError) return jsonResponse(400, { error: leadError });

  const lead = {
    fullName: clean(body.lead.fullName),
    companyName: clean(body.lead.companyName),
    email: clean(body.lead.email, 320),
    telephone: clean(body.lead.telephone, 80),
    address: clean(body.lead.address),
  };

  await notifyLead(lead, document);

  const location = STATIC_DOCUMENTS[document];
  if (!location) return jsonResponse(400, { error: 'Unsupported document' });

  return {
    statusCode: 302,
    headers: {
      ...PDF_HEADERS,
      Location: location,
    },
    body: '',
  };
};
