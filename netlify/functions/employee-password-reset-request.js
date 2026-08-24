const crypto = require('crypto');
const { phoneDigitVariants } = require('./_housekeepingServiceAuth.cjs');
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const GENERIC_MESSAGE = 'If an active employee account matches that phone number, a recovery code has been issued.';
function json(s, b) { return { statusCode: s, headers, body: JSON.stringify(b) }; }
async function sb(path, options = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
}
async function trySendSms(to, code) {
  if (!process.env.ESMS_AFRICA_API_KEY) return { sent: false, errorCode: 'SMS_NOT_CONFIGURED' };
  try {
    const endpoint = process.env.ESMS_AFRICA_API_URL || 'https://sms.esmsafrica.io/api/messages/send';
    const payload = { to: to.startsWith('+') ? to : `+${to}`, text: `FastCheckIn: your password reset code is ${code}. It expires in 60 minutes.` };
    if (process.env.ESMS_AFRICA_SENDER_ID) payload.sender_id = process.env.ESMS_AFRICA_SENDER_ID;
    const r = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${process.env.ESMS_AFRICA_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok ? { sent: true } : { sent: false, errorCode: 'SMS_PROVIDER_ERROR' };
  } catch { return { sent: false, errorCode: 'SMS_NETWORK_ERROR' }; }
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  try {
    const body = JSON.parse(event.body || '{}');
    const variants = phoneDigitVariants(body.phone || body.phone_number);
    if (!variants.length) return json(200, { success: true, message: GENERIC_MESSAGE });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return json(500, { error: 'Server configuration error' });
    const orClause = variants.map((v) => `phone_number.eq.${encodeURIComponent(v)}`).join(',');
    let path = `employees?select=id,business_id,phone_number,status,active&or=(${orClause})`;
    if (body.business_id || body.businessId) path += `&business_id=eq.${encodeURIComponent(body.business_id || body.businessId)}`;
    const res = await sb(path);
    if (!res.ok) return json(500, { error: 'Database error' });
    let candidates = await res.json(); if (!Array.isArray(candidates)) candidates = [];
    const matched = candidates.filter((e) => variants.includes(String(e.phone_number || '').replace(/\D/g, '')));
    if (matched.length !== 1) return json(200, { success: true, message: GENERIC_MESSAGE });
    const employee = matched[0];
    if (employee.status !== 'Active' || employee.active === false) return json(200, { success: true, message: GENERIC_MESSAGE });
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recent = await sb(`employee_password_resets?select=id&employee_id=eq.${encodeURIComponent(employee.id)}&created_at=gte.${encodeURIComponent(since)}`);
    if (recent.ok) { const r = await recent.json(); if (Array.isArray(r) && r.length >= 3) return json(200, { success: true, message: GENERIC_MESSAGE }); }
    const code = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(code).digest('hex');
    const ins = await sb('employee_password_resets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ employee_id: employee.id, business_id: employee.business_id, otp_hash: otpHash, expires_at: new Date(Date.now() + 3600000).toISOString() }) });
    if (!ins.ok) return json(200, { success: true, message: GENERIC_MESSAGE });
    const digits = String(employee.phone_number || '').replace(/\D/g, '');
    const e164 = digits.startsWith('27') ? digits : digits.startsWith('0') && digits.length === 10 ? `27${digits.slice(1)}` : digits.length === 9 ? `27${digits}` : digits;
    const sms = await trySendSms(e164, code);
    if (!sms.sent) await sb(`employee_password_resets?employee_id=eq.${encodeURIComponent(employee.id)}&otp_hash=eq.${encodeURIComponent(otpHash)}`, { method: 'DELETE' }).catch(() => {});
    return json(200, { success: true, message: GENERIC_MESSAGE });
  } catch (e) { console.error(e); return json(500, { error: 'Unable to start password recovery' }); }
};
