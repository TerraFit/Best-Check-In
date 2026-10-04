import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseInsert } from './lib/supabase-rest.js';

const PDF_HEADERS = {
  'Content-Type': 'application/pdf',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const JSON_HEADERS = { ...PDF_HEADERS, 'Content-Type': 'application/json' };
const MARKETING_BUCKET = 'fastcheckin-marketing';
const SIGNED_URL_EXPIRES_IN = 300;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);

async function verifyTurnstile(token, event, expectedAction) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not configured.');
    return { ok: false, error: 'CAPTCHA is temporarily unavailable. Please try again later.' };
  }
  if (!token || typeof token !== 'string' || token.length > 2048) {
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
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.warn('Turnstile verification failed:', result['error-codes'] || []);
      return { ok: false, error: 'CAPTCHA verification failed. Please try again.' };
    }

    const allowedHostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'fastcheckin.co.za,www.fastcheckin.co.za')
      .split(',').map((hostname) => hostname.trim().toLowerCase()).filter(Boolean);
    if (!result.hostname || !allowedHostnames.includes(String(result.hostname).toLowerCase())) {
      console.warn('Turnstile verification rejected an unexpected hostname.');
      return { ok: false, error: 'CAPTCHA verification failed. Please try again.' };
    }
    if (!expectedAction || result.action !== expectedAction) {
      console.warn('Turnstile verification rejected an unexpected action.');
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
      to: [process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za'],
      subject: 'Homepage resource download: ' + documentLabel,
      html,
    });
  } catch (error) {
    console.error('Homepage lead notification failed:', error);
  }
}

async function prepareProtectedResource(resource) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase Storage credentials are not configured.');
  }

  const storageBaseUrl = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1`;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const authHeaders = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  };

  // These are controlled static filenames. Uploading with x-upsert avoids
  // relying on Storage HEAD/not-found semantics and keeps the flow deterministic.
  const objectPath = resource.fileName;
  const objectUrl = `${storageBaseUrl}/object/${MARKETING_BUCKET}/${objectPath}`;

  console.info('prepareProtectedResource:start', {
    resource: resource.fileName,
    bucket: MARKETING_BUCKET,
  });

  const functionDir = path.dirname(fileURLToPath(import.meta.url));
  const lambdaRoot = process.env.LAMBDA_TASK_ROOT || process.cwd();
  const candidates = [
    path.resolve(process.cwd(), 'public', resource.fileName),
    path.resolve(lambdaRoot, 'public', resource.fileName),
    path.resolve(process.cwd(), resource.fileName),
    path.resolve(lambdaRoot, resource.fileName),
    path.resolve(functionDir, 'public', resource.fileName),
    path.resolve(functionDir, '../public', resource.fileName),
    path.resolve(functionDir, '../../public', resource.fileName),
  ];

  let filePath = null;
  let lastReadError = null;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      filePath = candidate;
      break;
    } catch (error) {
      lastReadError = error;
    }
  }

  if (!filePath) {
    console.error('Protected resource file is missing from the function bundle:', {
      resource: resource.fileName,
      cwd: process.cwd(),
      lambdaTaskRoot: process.env.LAMBDA_TASK_ROOT || null,
      candidates,
      error: lastReadError?.message || 'unknown file access error',
    });
    throw new Error('Protected resource file is unavailable in the deployed function bundle.');
  }

  const pdf = await readFile(filePath);
  console.info('prepareProtectedResource:bundle', {
    resource: resource.fileName,
    filePath,
    size: pdf.length,
  });

  const uploadResponse = await fetch(objectUrl, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/pdf',
      'Cache-Control': 'max-age=3600',
      'x-upsert': 'true',
    },
    body: pdf,
  });

  console.info('prepareProtectedResource:upload', {
    resource: resource.fileName,
    status: uploadResponse.status,
    size: pdf.length,
  });

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text().catch(() => '');
    console.error('Protected resource upload failed:', {
      resource: resource.fileName,
      filePath,
      size: pdf.length,
      statusCode: uploadResponse.status,
      message: details || uploadResponse.statusText,
    });
    throw new Error(
      `Unable to store protected resource: HTTP ${uploadResponse.status}${details ? ` — ${details}` : ''}`,
    );
  }

  const signResponse = await fetch(
    `${storageBaseUrl}/object/sign/${MARKETING_BUCKET}/${objectPath}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRES_IN }),
    },
  );

  console.info('prepareProtectedResource:sign', {
    resource: resource.fileName,
    status: signResponse.status,
  });

  if (!signResponse.ok) {
    const details = await signResponse.text().catch(() => '');
    throw new Error(
      `Unable to create protected download URL: HTTP ${signResponse.status}${details ? ` — ${details}` : ''}`,
    );
  }

  const signedData = await signResponse.json();
  const relativeOrAbsolute = signedData?.signedURL || signedData?.signedUrl;
  if (!relativeOrAbsolute) {
    throw new Error('Unable to create protected download URL: missing signed URL');
  }

  const downloadUrl = relativeOrAbsolute.startsWith('http')
    ? relativeOrAbsolute
    : `${storageBaseUrl}${relativeOrAbsolute.startsWith('/') ? '' : '/'}${relativeOrAbsolute}`;

  const signedUrl = new URL(downloadUrl);
  signedUrl.searchParams.set('download', 'true');

  console.info('prepareProtectedResource:complete', {
    resource: resource.fileName,
    host: signedUrl.hostname,
    path: signedUrl.pathname,
    hasToken: signedUrl.searchParams.has('token'),
  });

  return signedUrl.toString();
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
      to: [process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za'],
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
const PROTECTED_DOCUMENTS = {
  brochure: {
    fileName: 'FastCheckIn_Platform_Overview_Brochure.pdf',
    label: 'FastCheckIn Brochure',
  },
  'visitor-origin': {
    fileName: 'FastCheckIn_Visitor_Origin_Explorer_Snapshot.pdf',
    label: 'Visitor Origin Explorer Snapshot',
  },
  'business-snapshot': {
    fileName: 'FastCheckIn_Business_Snapshot.pdf',
    label: 'Business Snapshot',
  },
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  if (body.action === 'inquiry' || body.action === 'enterprise-inquiry') {
    const expectedAction = body.action === 'enterprise-inquiry' ? 'enterprise-enquiry' : 'homepage-enquiry';
    const captcha = await verifyTurnstile(body.turnstileToken, event, expectedAction);
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

  const captcha = await verifyTurnstile(body.turnstileToken, event, 'homepage-download');
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

  const resource = PROTECTED_DOCUMENTS[document];
  if (!resource) return jsonResponse(400, { error: 'Unsupported document' });

  try {
    await supabaseInsert('website_enquiries', {
      topic: 'Resource download: ' + resource.label,
      status: 'new',
      full_name: lead.fullName,
      company_name: lead.companyName,
      email: lead.email,
      telephone: lead.telephone,
      address: lead.address,
      website: null,
      total_rooms: null,
      total_establishments: null,
      sa_establishments: null,
      sa_provinces: [],
      international_establishments: 0,
      international_countries: [],
      comments: 'Homepage resource download: ' + resource.label,
    });
  } catch (error) {
    console.error('Resource download lead persistence failed:', error);
    return jsonResponse(500, { error: 'Unable to record your download request. Please try again.' });
  }

  await notifyLead(lead, document);

  try {
    const downloadUrl = await prepareProtectedResource(resource);
    return jsonResponse(200, { success: true, downloadUrl });
  } catch (error) {
    console.error('Protected resource preparation failed:', error);
    return jsonResponse(500, { error: 'The requested resource is temporarily unavailable. Please try again later.' });
  }
};
