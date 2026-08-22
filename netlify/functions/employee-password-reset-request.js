const crypto = require('crypto');

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

function normalizePhone(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('27')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.length === 9) return `+27${digits}`;
  return null;
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
  // eSMS Africa is used instead of Twilio so the recovery flow can use a
  // South-African SMS provider. Sandbox credentials can be used for testing.
  const apiKey = process.env.ESMS_AFRICA_API_KEY;
  const sender = process.env.ESMS_AFRICA_SENDER_ID;
  const endpoint = process.env.ESMS_AFRICA_API_URL || 'https://api.esmsafrica.io/v1/sms/send';

  if (!apiKey || !sender) throw new Error('eSMS Africa SMS provider is not configured');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      from: sender,
      message: `FastCheckIn: your password reset code is ${code}. It expires in 10 minutes. Do not share this code.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('eSMS Africa SMS failed:', response.status, detail);
    throw new Error('SMS delivery failed');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  try {
    const { phone } = JSON.parse(event.body || '{}');
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return json(400, { error: 'A valid phone number is required' });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return json(500, { error: 'Server configuration error' });
    }

    const digits = normalizedPhone.replace(/\D/g, '');
    const employeesResponse = await supabaseRequest('employees?select=id,business_id,phone_number,status');
    if (!employeesResponse.ok) return json(500, { error: 'Database error' });
    const employees = await employeesResponse.json();
    const employee = employees.find((candidate) => {
      const stored = String(candidate.phone_number || '').replace(/\D/g, '');
      return stored === digits || stored === digits.slice(2) || stored === `0${digits.slice(2)}`;
    });

    if (!employee || employee.status !== 'Active') {
      return json(200, { success: true, message: GENERIC_MESSAGE });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentResponse = await supabaseRequest(
      `employee_password_resets?select=id&employee_id=eq.${encodeURIComponent(employee.id)}&created_at=gte.${encodeURIComponent(since)}`
    );
    if (recentResponse.ok) {
      const recent = await recentResponse.json();
      if (recent.length >= 3) return json(200, { success: true, message: GENERIC_MESSAGE });
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

    try {
      await sendSms(normalizedPhone, code);
    } catch (smsError) {
      console.error('Employee reset SMS error:', smsError.message);
      await supabaseRequest(`employee_password_resets?employee_id=eq.${encodeURIComponent(employee.id)}&otp_hash=eq.${encodeURIComponent(otpHash)}`, {
        method: 'DELETE',
      }).catch(() => {});
      return json(503, { error: 'SMS recovery is temporarily unavailable. Please contact your administrator.' });
    }

    return json(200, { success: true, message: GENERIC_MESSAGE, expires_in_seconds: 600 });
  } catch (error) {
    console.error('Employee password reset request error:', error);
    return json(500, { error: 'Unable to start password recovery' });
  }
};
