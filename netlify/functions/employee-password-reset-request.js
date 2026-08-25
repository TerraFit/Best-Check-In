const crypto = require('crypto');
const { phoneDigitVariants } = require('./_housekeepingServiceAuth.cjs');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GENERIC_MESSAGE = 'If an active employee account matches that phone number, a verification code has been sent.';

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function sendSms(to, code) {
  const apiKey = process.env.ESMS_AFRICA_API_KEY;
  const senderId = process.env.ESMS_AFRICA_SENDER_ID;
  const endpoint = process.env.ESMS_AFRICA_API_URL || 'https://sms.esmsafrica.io/api/messages/send';

  if (!apiKey) {
    const error = new Error('eSMS Africa SMS provider is not configured');
    error.code = 'ESMS_CONFIG_MISSING';
    throw error;
  }

  const payload = {
    to: to.startsWith('+') ? to : `+${to}`,
    text: `FastCheckIn: your password reset code is ${code}. It expires in 10 minutes. Do not share this code.`,
  };
  if (senderId) payload.sender_id = senderId;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('eSMS Africa network error:', error?.message || error);
    const networkError = new Error('SMS provider request failed');
    networkError.code = 'ESMS_NETWORK_ERROR';
    throw networkError;
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error('eSMS Africa SMS failed:', response.status, detail);
    const providerError = new Error('SMS delivery failed');
    providerError.code =
      response.status === 400 ? 'ESMS_BAD_REQUEST' :
      response.status === 401 || response.status === 403 ? 'ESMS_AUTH_FAILED' :
      response.status === 429 ? 'ESMS_RATE_LIMITED' :
      response.status >= 500 ? 'ESMS_PROVIDER_ERROR' :
      'ESMS_REQUEST_REJECTED';
    throw providerError;
  }

  console.log('eSMS Africa SMS accepted for delivery');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const variants = phoneDigitVariants(body.phone || body.phone_number);
    if (!variants.length) return json(400, { error: 'A valid phone number is required' });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return json(500, { error: 'Server configuration error' });
    }

    const orClause = variants.map((v) => `phone_number.eq.${encodeURIComponent(v)}`).join(',');
    let path = `employees?select=id,business_id,phone_number,status,active&or=(${orClause})`;
    if (body.business_id || body.businessId) {
      path += `&business_id=eq.${encodeURIComponent(body.business_id || body.businessId)}`;
    }

    const employeesResponse = await supabaseRequest(path);
    if (!employeesResponse.ok) return json(500, { error: 'Database error' });
    let candidates = await employeesResponse.json();
    if (!Array.isArray(candidates)) candidates = [];

    const matched = candidates.filter((employee) =>
      variants.includes(String(employee.phone_number || '').replace(/\D/g, ''))
    );
    if (matched.length !== 1) return json(200, { success: true, message: GENERIC_MESSAGE });

    const employee = matched[0];
    if (employee.status !== 'Active' || employee.active === false) {
      return json(200, { success: true, message: GENERIC_MESSAGE });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentResponse = await supabaseRequest(
      `employee_password_resets?select=id&employee_id=eq.${encodeURIComponent(employee.id)}&created_at=gte.${encodeURIComponent(since)}`
    );
    if (recentResponse.ok) {
      const recent = await recentResponse.json();
      if (Array.isArray(recent) && recent.length >= 3) {
        return json(200, { success: true, message: GENERIC_MESSAGE });
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertResponse = await supabaseRequest('employee_password_resets', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        employee_id: employee.id,
        business_id: employee.business_id,
        otp_hash: otpHash,
        expires_at: expiresAt,
      }),
    });

    if (!insertResponse.ok) {
      console.error('Could not create employee password reset:', await insertResponse.text());
      return json(500, { error: 'Could not start password recovery' });
    }

    const digits = String(employee.phone_number || '').replace(/\D/g, '');
    const e164 = digits.startsWith('27')
      ? `+${digits}`
      : digits.startsWith('0') && digits.length === 10
        ? `+27${digits.slice(1)}`
        : digits.length === 9
          ? `+27${digits}`
          : `+${digits}`;

    try {
      await sendSms(e164, code);
    } catch (smsError) {
      console.error('Employee reset SMS error:', smsError.code || smsError.message);
      await supabaseRequest(
        `employee_password_resets?employee_id=eq.${encodeURIComponent(employee.id)}&otp_hash=eq.${encodeURIComponent(otpHash)}`,
        { method: 'DELETE' }
      ).catch(() => {});
      return json(503, {
        error: 'SMS recovery is temporarily unavailable. Please contact your administrator.',
        diagnostic: smsError.code || 'ESMS_UNKNOWN_ERROR',
      });
    }

    return json(200, { success: true, message: GENERIC_MESSAGE, expires_in_seconds: 600 });
  } catch (error) {
    console.error('Employee password reset request error:', error);
    return json(500, { error: 'Unable to start password recovery' });
  }
};
