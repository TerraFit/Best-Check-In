const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function buildRegistrationCardEmail({ businessName, validationUrl }) {
  const safeName = escapeHtml(businessName || 'your property');
  const safeUrl = escapeHtml(validationUrl);
  const subject = 'Complete your FastCheckIn application';
  const preview = 'One quick step remains before we can review your FastCheckIn application.';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="padding:22px 30px;background:#ffffff;text-align:left">
          <img src="https://fastcheckin.co.za/fastcheckin-logo.png" width="190" alt="FastCheckIn" style="display:block;width:190px;max-width:100%;height:auto;border:0">
        </td></tr>
        <tr><td>
          <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=82" width="600" alt="A welcoming hotel resort with a swimming pool" style="display:block;width:100%;max-width:600px;height:auto;border:0">
        </td></tr>
        <tr><td style="padding:32px 34px 12px">
          <p style="margin:0 0 10px;color:#c66a20;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">Your application · One final step</p>
          <h1 style="margin:0 0 18px;color:#172b3a;font-size:27px;line-height:1.25;font-weight:700">Let's get your property connected.</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#4b5563">Thank you for applying to FastCheckIn for <strong style="color:#1f2937">${safeName}</strong>. We have received your application. Before our team can review it, please complete a quick, secure card validation through Peach Payments.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;background:#fff8ef;border-left:4px solid #d97732">
            <tr><td style="padding:16px 18px">
              <p style="margin:0 0 6px;color:#8a4b1d;font-size:14px;font-weight:bold">No payment is taken now</p>
              <p style="margin:0;color:#654b3b;font-size:14px;line-height:1.6">This step validates your card and authorises a future recurring mandate. Your 14-day free trial begins only on the day after your application is approved.</p>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto 22px">
            <tr><td align="center" bgcolor="#c66a20" style="border-radius:7px">
              <a href="${safeUrl}" style="display:inline-block;padding:15px 26px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:7px">Continue secure card validation</a>
            </td></tr>
          </table>
          <p style="margin:0 0 18px;color:#6b7280;font-size:13px;line-height:1.6">For your security, this personal link expires in 48 hours. If it expires, contact our team and we can send you a new one.</p>
          <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6">We look forward to helping you deliver a smoother guest experience and make better use of your hospitality data.</p>
        </td></tr>
        <tr><td style="padding:0 34px 26px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-top:1px solid #e5e7eb;padding-top:22px">
            <p style="margin:0 0 5px;color:#172b3a;font-size:14px;font-weight:bold">Hospitality, connected.</p>
            <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6">FastCheckIn · Digital guest check-in and hospitality intelligence<br><a href="https://fastcheckin.co.za" style="color:#c66a20;text-decoration:none">fastcheckin.co.za</a></p>
            <p style="margin:14px 0 0;color:#9ca3af;font-size:11px;line-height:1.5">If you did not submit this application, you can safely ignore this email.</p>
          </td></tr></table>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:11px">© FastCheckIn</p>
    </td></tr>
  </table>
</body></html>`;

  const text = `Complete your FastCheckIn application

Thank you for applying to FastCheckIn for ${businessName || 'your property'}.

Before our team can review your application, please complete secure card validation through Peach Payments:
${validationUrl}

No payment is taken now. This step validates your card and authorises a future recurring mandate. Your 14-day free trial begins only on the day after your application is approved.

This personal link expires in 48 hours. If it expires, contact our team and we can send you a new one.

Hospitality, connected.
FastCheckIn — https://fastcheckin.co.za

If you did not submit this application, you can safely ignore this email.`;

  return { subject, html, text };
}
