const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { phoneDigitVariants } = require('./_housekeepingServiceAuth.cjs');
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
function json(s, b) { return { statusCode: s, headers, body: JSON.stringify(b) }; }
async function sb(path, options = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  try {
    const { phone, phone_number, code, token, password } = JSON.parse(event.body || '{}');
    const submitted = String(code || token || '');
    if (!submitted || submitted.length < 6) return json(400, { error: 'Invalid or expired verification code' });
    if (typeof password !== 'string' || password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
    const variants = phoneDigitVariants(phone || phone_number);
    if (!variants.length) return json(400, { error: 'Invalid or expired verification code' });
    const orClause = variants.map((v) => `phone_number.eq.${encodeURIComponent(v)}`).join(',');
    const er = await sb(`employees?select=id,business_id,phone_number,status,active&or=(${orClause})`);
    if (!er.ok) return json(500, { error: 'Database error' });
    let candidates = await er.json(); if (!Array.isArray(candidates)) candidates = [];
    const matched = candidates.filter((e) => variants.includes(String(e.phone_number || '').replace(/\D/g, '')));
    if (matched.length !== 1) return json(400, { error: 'Invalid or expired verification code' });
    const employee = matched[0];
    if (employee.status !== 'Active' || employee.active === false) return json(400, { error: 'Invalid or expired verification code' });
    const rr = await sb(`employee_password_resets?select=id,token_hash,expires_at,attempts,used_at&employee_id=eq.${encodeURIComponent(employee.id)}&used_at=is.null&order=created_at.desc&limit=1`);
    if (!rr.ok) return json(500, { error: 'Database error' });
    const reset = (await rr.json())[0];
    if (!reset || reset.attempts >= 5 || new Date(reset.expires_at).getTime() < Date.now()) return json(400, { error: 'Invalid or expired verification code' });
    const submittedHash = crypto.createHash('sha256').update(submitted).digest('hex');
    let match = false;
    try { match = crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(String(reset.token_hash), 'hex')); } catch { match = false; }
    if (!match) {
      await sb(`employee_password_resets?id=eq.${encodeURIComponent(reset.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: reset.attempts + 1 }) });
      return json(400, { error: 'Invalid or expired verification code' });
    }
    const now = new Date().toISOString();
    const claim = await sb(`employee_password_resets?id=eq.${encodeURIComponent(reset.id)}&used_at=is.null`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ used_at: now }) });
    if (!claim.ok || (await claim.json()).length !== 1) return json(400, { error: 'Invalid or expired verification code' });
    const passwordHash = await bcrypt.hash(password, 12);
    const up = await sb(`employees?id=eq.${encodeURIComponent(employee.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ password_hash: passwordHash, updated_at: now }) });
    if (!up.ok) return json(500, { error: 'Could not update password' });
    await sb(`employee_password_resets?employee_id=eq.${encodeURIComponent(employee.id)}&used_at=is.null&id=neq.${encodeURIComponent(reset.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ used_at: now }) }).catch(() => {});
    return json(200, { success: true, message: 'Password updated successfully' });
  } catch (e) { console.error(e); return json(500, { error: 'Unable to reset password' }); }
};
