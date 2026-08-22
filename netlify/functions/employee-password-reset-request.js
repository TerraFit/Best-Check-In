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
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error('SMS provider is not configured');

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `FastCheckIn: your password reset code is ${code}. It expires in 10 minutes. Do not share this code.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Twilio SMS failed:', response.status, detail);
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

    // Look up by normalized digits so existing +27 / 0xx / local formats all work.
    const digits = normalizedPhone.replace(/\D/g, '');
    // `employees` uses status as the account-state field; there is no `active` column.
    const employeesResponse = await supabaseRequest('employees?select=id,business_id,phone_number,status');
    if (!employeesResponse.ok) return json(500, { error: 'Database error' });
    const employees = await employeesResponse.json();
    const employee = employees.find((candidate) => {
      const stored = String(candidate.phone_number || '').replace(/\D/g, '');
      return stored === digits || stored === digits.slice(2) || stored === `0${digits.slice(2)}`;
    });

    // Deliberately return the same response for unknown/inactive accounts.
    if (!employee || employee.status !== 'Active') {
      return json(200, { success: true, message: GENERIC_MESSAGE });
    }

    // Basic abuse protection: max 3 codes per employee in 15 minutes.
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
      // Remove the unusable reset record so a retry can be requested immediately.
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
