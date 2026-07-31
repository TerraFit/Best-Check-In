// Printable Lost & Found tag — local QR, full operational fields
import { generateQrDataUrl, lostFoundQrPayload } from './qrLocal';
import type { LostFoundItem } from '../types/lostFound';

export async function printLostFoundTag(
  item: LostFoundItem,
  businessName?: string
): Promise<void> {
  const qrPayload = lostFoundQrPayload({
    id: item.id,
    tag_number: item.tag_number,
    business_id: item.business_id,
  });
  const qrUrl = await generateQrDataUrl(qrPayload, { width: 180, margin: 1 });

  const win = window.open('', '_blank', 'width=420,height=620');
  if (!win) return;

  const storage = [item.storage_location, item.storage_detail].filter(Boolean).join(' · ') || '—';
  const printedAt = new Date().toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  win.document.write(`<!DOCTYPE html>
<html><head><title>${item.tag_number || 'Lost & Found'}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; margin: 0; color: #111; }
  .tag { border: 2px solid #111; border-radius: 12px; padding: 20px; max-width: 320px; margin: 0 auto; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; text-align: center; }
  h1 { font-size: 26px; margin: 8px 0 4px; text-align: center; font-family: ui-monospace, monospace; }
  .biz { text-align: center; font-size: 12px; color: #444; margin-bottom: 12px; }
  img.qr { display: block; margin: 0 auto 12px; width: 160px; height: 160px; }
  .meta { font-size: 13px; line-height: 1.55; }
  .meta div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #eee; padding: 4px 0; }
  .meta span.label { color: #666; font-weight: 600; }
  .meta span.val { text-align: right; font-weight: 500; }
  .footer { margin-top: 14px; text-align: center; font-size: 11px; color: #555; }
  @media print {
    body { padding: 0; }
    button { display: none !important; }
  }
</style></head><body>
  <div class="tag">
    <div class="brand">FastCheckIn Lost & Found</div>
    <h1>${item.tag_number || '—'}</h1>
    ${businessName ? `<div class="biz">${escapeHtml(businessName)}</div>` : ''}
    <img class="qr" src="${qrUrl}" alt="QR Code" />
    <div class="meta">
      <div><span class="label">Item</span><span class="val">${escapeHtml(item.item_name || '—')}</span></div>
      <div><span class="label">Category</span><span class="val">${escapeHtml(item.category || '—')}</span></div>
      <div><span class="label">Room</span><span class="val">${escapeHtml(item.room_number || '—')}</span></div>
      <div><span class="label">Found By</span><span class="val">${escapeHtml(item.found_by_staff_name || '—')}</span></div>
      <div><span class="label">Date Found</span><span class="val">${escapeHtml(item.found_date || '—')}</span></div>
      <div><span class="label">Storage</span><span class="val">${escapeHtml(storage)}</span></div>
    </div>
    <div class="footer">Scan QR to open this record<br/>Printed ${escapeHtml(printedAt)}</div>
  </div>
  <p style="text-align:center;margin-top:16px">
    <button onclick="window.print()" style="padding:8px 16px;font-size:14px">Print</button>
  </p>
  <script>setTimeout(function(){ window.print(); }, 350);</script>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
