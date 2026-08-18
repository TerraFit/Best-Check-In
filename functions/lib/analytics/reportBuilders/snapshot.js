import { inflateSync, deflateSync } from 'node:zlib';
import { buildVisualPdf, textCmd, rectCmd, imageCmd } from './simplePdf.js';

const INK = '#172033';
const MUTED = '#64748b';
const LIGHT = '#f8fafc';
const BORDER = '#e2e8f0';
const ORANGE = '#f97316';
const TEAL = '#0f766e';
const BLUE = '#2563eb';
const GREEN = '#16a34a';
const PALETTE = ['#f97316', '#2563eb', '#0f766e', '#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c'];

function pct(v) { return `${Number(v || 0).toFixed(1)}%`; }
function money(v) { return `R ${Number(v || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`; }
function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (m) => m.toUpperCase());
}
function referralLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  const labels = {
    word_of_mouth: 'Word of Mouth',
    research_engine: 'Research Engine',
    facebook_instagram: 'Facebook / Instagram',
    facebook: 'Facebook',
    instagram: 'Instagram',
    booking_com: 'Booking.com',
    bookingcom: 'Booking.com',
  };
  return labels[key] || titleCase(value);
}
function maxCount(items) { return Math.max(1, ...(items || []).map((n) => Number(n.count || 0))); }

function addHeader(commands, businessName, meta, section, logoName = null) {
  commands.push(rectCmd(0, 0, 595, 842, '#ffffff'));
  commands.push(rectCmd(0, 785, 595, 57, '#ffffff'));
  commands.push(rectCmd(42, 785, 4, 57, ORANGE));
  if (logoName) commands.push(imageCmd(logoName, 58, 794, 76, 40));
  const textX = logoName ? 148 : 58;
  commands.push(textCmd(businessName || 'Accommodation Business', textX, 819, 20, INK, true));
  commands.push(textCmd('Analytics Snapshot', textX, 801, 9, ORANGE, true));
  commands.push(textCmd(`${meta.dateFrom || ''} – ${meta.dateTo || ''}`, 420, 817, 8, MUTED, true));
  if (section) commands.push(textCmd(section.toUpperCase(), 420, 802, 6.5, MUTED, true));
}

function kpi(commands, x, y, w, label, value, accent, detail = '') {
  commands.push(rectCmd(x, y, w, 76, '#ffffff', BORDER));
  commands.push(rectCmd(x, y, 5, 76, accent));
  commands.push(textCmd(label, x + 15, y + 54, 7, MUTED, true));
  commands.push(textCmd(value, x + 15, y + 27, 18, INK, true));
  if (detail) commands.push(textCmd(detail, x + 15, y + 11, 6.5, MUTED));
}

function drawBarList(commands, items, x, y, w, title, labelFn, maxItems = 8, barColor = ORANGE, rowH = 31) {
  if (title) commands.push(textCmd(title, x, y, 12, INK, true));
  const rows = (items || []).slice(0, maxItems);
  const max = maxCount(rows);
  rows.forEach((item, i) => {
    const yy = y - (title ? 25 : 8) - i * rowH;
    const label = labelFn ? labelFn(item) : String(item.name || item.bucket || '');
    commands.push(textCmd(label, x, yy + 7, 7.7, INK, true));
    const barX = x + 145;
    const barW = w - 205;
    const width = Math.max(2, (Number(item.count || 0) / max) * barW);
    commands.push(rectCmd(barX, yy, barW, 13, '#eef2f7'));
    commands.push(rectCmd(barX, yy, width, 13, PALETTE[i % PALETTE.length] || barColor));
    commands.push(textCmd(`${item.count ?? 0} · ${pct(item.percentage)}`, x + w - 54, yy + 4, 7, MUTED, true));
  });
}

function drawReferralMatrix(commands, rows, x, y, w) {
  commands.push(textCmd('Who uses which channel?', x, y, 12, INK, true));
  commands.push(textCmd('Share of each guest market by acquisition channel', x, y - 15, 7, MUTED));
  const displayRows = (rows || []).filter((r) => r.total > 0).slice(0, 6);
  const topSources = [];
  displayRows.forEach((row) => row.channels.forEach((c) => { if (!topSources.includes(c.source)) topSources.push(c.source); }));
  const sources = topSources.slice(0, 4);
  const colW = (w - 120) / Math.max(1, sources.length);
  const startY = y - 45;
  commands.push(rectCmd(x, startY - 7, w, 24, LIGHT, BORDER));
  commands.push(textCmd('Guest market', x + 8, startY + 2, 7, MUTED, true));
  sources.forEach((source, i) => commands.push(textCmd(referralLabel(source), x + 120 + i * colW, startY + 2, 6.5, MUTED, true)));
  displayRows.forEach((row, r) => {
    const yy = startY - 31 - r * 31;
    if (r % 2 === 0) commands.push(rectCmd(x, yy - 6, w, 25, '#ffffff'));
    commands.push(textCmd(`${row.country} (${row.total})`, x + 8, yy + 2, 7, INK, true));
    sources.forEach((source, i) => {
      const channel = row.channels.find((c) => c.source === source);
      commands.push(textCmd(channel ? pct(channel.percentage) : '—', x + 120 + i * colW, yy + 2, 7, channel ? PALETTE[i % PALETTE.length] : '#94a3b8', !!channel));
    });
  });
}

function addReferralInsights(commands, rows, x, y) {
  const usable = (rows || []).filter((r) => r.total > 0 && r.dominantSource).slice(0, 3);
  commands.push(textCmd('What the data tells you', x, y, 12, INK, true));
  usable.forEach((row, i) => {
    const yy = y - 27 - i * 27;
    commands.push(rectCmd(x, yy - 7, 5, 20, PALETTE[i % PALETTE.length]));
    commands.push(textCmd(row.country, x + 14, yy + 5, 7.5, INK, true));
    commands.push(textCmd(`${referralLabel(row.dominantSource)} leads this market at ${pct(row.dominantPercentage)}.`, x + 95, yy + 5, 7, MUTED));
  });
}

function drawRoomPerformance(commands, rooms, topY = 500) {
  const rows = (rooms || []).slice(0, 6);
  const maxUtil = Math.max(1, ...rows.map((r) => Number(r.utilisation || 0)));
  commands.push(textCmd('Room performance', 50, topY, 14, INK, true));
  commands.push(textCmd('Room-night utilisation for the selected reporting period.', 50, topY - 16, 8, MUTED));
  rows.forEach((room, i) => {
    const yy = topY - 55 - i * 43;
    const label = `${room.roomNumber || ''}${room.roomNumber ? '. ' : ''}${room.roomName || 'Room'}`;
    commands.push(textCmd(label, 50, yy + 12, 8.5, INK, true));
    commands.push(textCmd(room.roomType || '', 50, yy, 6.5, MUTED));
    commands.push(rectCmd(190, yy, 245, 14, '#eef2f7'));
    const bar = Math.max(2, (Number(room.utilisation || 0) / maxUtil) * 245);
    const color = room.performanceBand === 'above' ? GREEN : room.performanceBand === 'below' ? '#dc2626' : ORANGE;
    commands.push(rectCmd(190, yy, bar, 14, color));
    commands.push(textCmd(`${pct(room.utilisation)} · ${room.roomNightsSold || 0} nights`, 445, yy + 3, 7, MUTED, true));
  });
  return topY - 55 - rows.length * 43;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(signature)) return null;
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) return null;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType)) return null;
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(width * height * 3);
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const value = inflated[src++];
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 255;
      else if (filter === 2) row[x] = (value + up) & 255;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (value + paeth(left, up, upLeft)) & 255;
      else return null;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 3;
      const alpha = colorType === 6 ? row[si + 3] / 255 : 1;
      raw[di] = Math.round(row[si] * alpha + 255 * (1 - alpha));
      raw[di + 1] = Math.round(row[si + 1] * alpha + 255 * (1 - alpha));
      raw[di + 2] = Math.round(row[si + 2] * alpha + 255 * (1 - alpha));
    }
    prev = row;
  }
  return { width, height, data: deflateSync(raw), filter: 'FlateDecode' };
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 9 < buffer.length) {
    if (buffer[pos] !== 0xff) { pos++; continue; }
    const marker = buffer[pos + 1];
    pos += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (pos + 2 > buffer.length) break;
    const len = buffer.readUInt16BE(pos);
    if (len < 2 || pos + len > buffer.length) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: buffer.readUInt16BE(pos + 5), height: buffer.readUInt16BE(pos + 3), data: buffer, filter: 'DCTDecode' };
    }
    pos += len;
  }
  return null;
}

async function fetchLogoImage(logoUrl) {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('jpeg') || contentType.includes('jpg') || (buffer[0] === 0xff && buffer[1] === 0xd8)) {
      return jpegSize(buffer);
    }
    return decodePng(buffer);
  } catch (error) {
    console.warn('Snapshot logo unavailable:', error?.message || error);
    return null;
  }
}

export async function buildSnapshotPdfPayload(summary) {
  const meta = summary.meta || {};
  const s = summary.summary || {};
  const occ = s.occupancy || {};
  const businessName = meta.businessName || 'Accommodation Business';
  const logo = await fetchLogoImage(meta.logoUrl);
  const images = logo ? [{ name: 'BusinessLogo', ...logo }] : [];
  const logoName = logo ? 'BusinessLogo' : null;

  const page1 = [];
  addHeader(page1, businessName, meta, 'Executive overview', logoName);
  page1.push(textCmd('Management snapshot', 50, 730, 18, INK, true));
  page1.push(textCmd('A concise view of guest demand, visitor markets and commercial performance.', 50, 712, 8.5, MUTED));
  kpi(page1, 50, 620, 118, 'CHECK-INS', String(s.totalBookings ?? 0), ORANGE, `${s.domesticCount ?? 0} domestic · ${s.internationalCount ?? 0} international`);
  kpi(page1, 178, 620, 118, 'GUESTS', String(s.totalGuests ?? 0), BLUE, `Average party ${s.averagePartySize ?? 0}`);
  kpi(page1, 306, 620, 118, 'OCCUPANCY', pct(occ.occupancyRate), TEAL, `${occ.roomNightsSold ?? 0} room-nights sold`);
  kpi(page1, 434, 620, 111, 'REVENUE', money(s.totalRevenue), GREEN, 'Reporting period');
  page1.push(textCmd('Visitor mix', 50, 590, 11, INK, true));
  page1.push(rectCmd(50, 545, 495, 28, '#f8fafc', BORDER));
  const domesticW = 495 * (Number(s.domesticPercentage || 0) / 100);
  page1.push(rectCmd(50, 545, domesticW, 28, ORANGE));
  page1.push(textCmd(`South Africa · ${s.domesticCount ?? 0} (${pct(s.domesticPercentage)})`, 60, 556, 7, '#ffffff', true));
  page1.push(textCmd(`International · ${s.internationalCount ?? 0} (${pct(s.internationalPercentage)})`, 55 + domesticW, 556, 7, INK, true));
  page1.push(textCmd(`Average stay ${s.averageStay ?? 0} nights · Marketing consent ${pct(s.consentRate)} · Returning guests ${pct(s.returningRate)}`, 50, 528, 7.5, MUTED));
  drawBarList(page1, summary.originCountries || [], 50, 490, 495, 'Visitor origin', (n) => String(n.name || ''), 9, ORANGE, 28);
  page1.push(textCmd('Countries with no bookings are intentionally omitted from this ranked business view.', 50, 190, 6.5, '#94a3b8'));

  const page2 = [];
  addHeader(page2, businessName, meta, 'Acquisition intelligence', logoName);
  page2.push(textCmd('How Guests Found You', 50, 730, 18, INK, true));
  page2.push(textCmd('Acquisition performance and the relationship between guest market and booking channel.', 50, 712, 8.5, MUTED));
  drawBarList(page2, summary.referralData || [], 50, 680, 495, 'Overall acquisition', (n) => referralLabel(n.name), 7, ORANGE, 27);
  drawReferralMatrix(page2, summary.referralByCountry || [], 50, 420, 495);
  addReferralInsights(page2, summary.referralByCountry || [], 50, 150);
  page2.push(textCmd('Insight percentages are calculated within each guest market, not against the overall booking total.', 50, 42, 6.5, '#94a3b8'));

  const page3 = [];
  addHeader(page3, businessName, meta, 'Stay and room performance', logoName);
  page3.push(textCmd('Length of stay', 50, 730, 14, INK, true));
  page3.push(textCmd('How long guests are staying during the selected reporting period.', 50, 714, 8, MUTED));
  drawBarList(page3, summary.lengthOfStay || [], 50, 690, 495, '', (n) => `${n.bucket} night${n.bucket === '1' ? '' : 's'}`, 4, BLUE, 32);
  const roomBottom = drawRoomPerformance(page3, summary.roomPerformance?.rooms || [], 505);
  const roomY = Math.max(120, roomBottom - 24);
  page3.push(textCmd('Management notes', 50, roomY, 11, INK, true));
  page3.push(textCmd(`Occupancy: ${occ.roomNightsSold ?? 0} sold / ${occ.sellableRoomNights ?? 0} sellable room-nights`, 50, roomY - 18, 7.5, MUTED));
  page3.push(textCmd(`Top referral: ${referralLabel(s.topReferral || 'N/A')} · Top month: ${s.topMonth || 'N/A'}`, 50, roomY - 32, 7.5, MUTED));
  page3.push(textCmd(`Generated ${meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString('en-ZA') : ''} · POPIA Compliant · Confidential`, 50, 42, 6.5, '#94a3b8'));

  return buildVisualPdf([{ commands: page1 }, { commands: page2 }, { commands: page3 }], {
    images,
    footer: 'Prepared with FastCheckIn Analytics · POPIA Compliant · Confidential',
  });
}
