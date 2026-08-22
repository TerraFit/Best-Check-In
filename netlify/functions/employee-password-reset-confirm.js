const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  try {
    const { phone, code, password } = JSON.parse(event.body || '{}');
    if (!phone || !/^\d{6}$/.test(String(code || ''))) {
      return json(400, { error: 'Phone number and 6-digit verification code are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return json(400, { error: 'Password must be at least 8 characters' });
    }

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return json(400, { error: 'A valid phone number is required' });

    const employeesResponse = await supabaseRequest('employees?select=id,phone_number,status,active');
    if (!employeesResponse.ok) return json(500, { error: 'Database error' });
    const employees = await employeesResponse.json();
    const employee = employees.find((candidate) => {
      const stored = String(candidate.phone_number || '').replace(/\D/g, '');
      return stored === digits || stored === digits.replace(/^27/, '') || stored === `0${digits.replace(/^27/, '')}`;
    });

    if (!employee || employee.active === false || employee.status === 'Disabled' || employee.status === 'Pending') {
      return json(400, { error: 'Invalid or expired verification code' });
    }

    const resetResponse = await supabaseRequest(
      `employee_password_resets?select=id,otp_hash,expires_at,attempts,used_at&employee_id=eq.${encodeURIComponent(employee.id)}&used_at=is.null&order=created_at.desc&limit=1`
    );
    if (!resetResponse.ok) return json(500, { error: 'Database error' });
    const resets = await resetResponse.json();
    const reset = resets[0];

    if (!reset || reset.attempts >= 5 || new Date(reset.expires_at).getTime() < Date.now()) {
      return json(400, { error: 'Invalid or expired verification code' });
    }

    const otpHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(otpHash, 'hex'), Buffer.from(reset.otp_hash, 'hex'))) {
      await supabaseRequest(`employee_password_resets?id=eq.${encodeURIComponent(reset.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ attempts: reset.attempts + 1 }),
      });
      return json(400, { error: 'Invalid or expired verification code' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const updateEmployee = await supabaseRequest(`employees?id=eq.${encodeURIComponent(employee.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ password_hash: passwordHash, updated_at: now }),
    });
    if (!updateEmployee.ok) {
      console.error('Employee password update failed:', await updateEmployee.text());
      return json(500, { error: 'Could not update password' });
    }

    await supabaseRequest(`employee_password_resets?id=eq.${encodeURIComponent(reset.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ used_at: now }),
    });

    // Invalidate all other outstanding reset challenges for this employee.
    await supabaseRequest(`employee_password_resets?employee_id=eq.${encodeURIComponent(employee.id)}&used_at=is.null&id=neq.${encodeURIComponent(reset.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ used_at: now }),
    }).catch(() => {});

    return json(200, { success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Employee password reset confirmation error:', error);
    return json(500, { error: 'Unable to reset password' });
  }
};
