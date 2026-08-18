import { buildVisualPdf, textCmd, rectCmd, circleCmd } from './simplePdf.js';

const INK = '#172033';
const MUTED = '#64748b';
const ORANGE = '#f97316';
const TEAL = '#0f766e';
const BLUE = '#2563eb';
const GREEN = '#16a34a';
const PALETTE = ['#f97316', '#2563eb', '#0f766e', '#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c'];

const CENTROIDS = {
  'South Africa': [-29, -29], Switzerland: [8, 47], Germany: [10, 51], Netherlands: [5, 52],
  Australia: [134, -25], 'United Kingdom': [-3, 55], Italy: [12, 42], Argentina: [-64, -34],
  France: [2, 46], Spain: [-4, 40], Portugal: [-8, 39], Austria: [14, 47], Belgium: [4, 50],
  'United States': [-100, 39], Canada: [-106, 57], Mexico: [-102, 23], Brazil: [-52, -10],
  Chile: [-71, -33], China: [104, 35], India: [79, 22], Japan: [138, 37],
  'New Zealand': [174, -41], Namibia: [18, -22], Botswana: [24, -22],
};

function pct(v) { return `${Number(v || 0).toFixed(1)}%`; }
function money(v) { return `R ${Number(v || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function mapPoint(lon, lat) {
  const x = 50 + ((lon + 180) / 360) * 495;
  const y = 205 + ((lat + 90) / 180) * 245;
  return [x, y];
}

function addHeader(commands, businessName, meta) {
  commands.push(rectCmd(0, 0, 595, 842, '#ffffff'));
  commands.push(rectCmd(0, 742, 595, 100, '#fff7ed'));
  commands.push(rectCmd(42, 772, 52, 52, ORANGE));
  commands.push(textCmd('FC', 52, 791, 15, '#ffffff', true));
  commands.push(textCmd('FastCheckIn', 108, 806, 16, INK, true));
  commands.push(textCmd(businessName, 108, 786, 11, MUTED, true));
  commands.push(textCmd('Analytics Snapshot', 108, 766, 9, ORANGE, true));
  commands.push(textCmd(`${meta.dateFrom} – ${meta.dateTo}`, 430, 806, 8.5, MUTED));
}

function kpi(commands, x, y, w, label, value, accent) {
  commands.push(rectCmd(x, y, w, 62, '#ffffff', '#e5e7eb'));
  commands.push(rectCmd(x, y, 5, 62, accent));
  commands.push(textCmd(label, x + 14, y + 43, 7.5, MUTED, true));
  commands.push(textCmd(value, x + 14, y + 21, 17, INK, true));
}

function drawOriginMap(commands, countries) {
  const x0 = 50, y0 = 205, w = 495, h = 245;
  commands.push(rectCmd(x0, y0, w, h, '#f8fafc', '#e2e8f0'));
  for (let lon = -150; lon <= 150; lon += 30) {
    const [x] = mapPoint(lon, 0);
    commands.push(`0.88 0.91 0.95 RG 0.4 w ${x} ${y0} m ${x} ${y0 + h} l S`);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = mapPoint(0, lat);
    commands.push(`0.88 0.91 0.95 RG 0.4 w ${x0} ${y} m ${x0 + w} ${y} l S`);
  }
  commands.push(textCmd('WORLD VISITOR ORIGIN', x0 + 12, y0 + h - 20, 8, MUTED, true));
  commands.push(textCmd('Coloured nodes are actual country aggregates; countries with no bookings remain neutral.', x0 + 12, y0 + h - 34, 6.5, '#94a3b8'));

  const max = Math.max(1, ...countries.map((n) => Number(n.count || 0)));
  countries.forEach((n, i) => {
    const p = CENTROIDS[n.name] || [0, 0];
    const [px, py] = mapPoint(p[0], p[1]);
    const r = 5 + Math.sqrt(Number(n.count || 0) / max) * 17;
    const color = PALETTE[i % PALETTE.length];
    commands.push(circleCmd(px, py, r, color));
    commands.push(circleCmd(px, py, Math.max(2, r - 2), '#ffffff'));
    commands.push(circleCmd(px, py, Math.max(1.5, r - 4), color));
    const labelX = clamp(px + r + 4, x0 + 5, x0 + w - 105);
    const labelY = clamp(py + 3, y0 + 12, y0 + h - 12);
    commands.push(textCmd(`${n.name} · ${pct(n.percentage)}`, labelX, labelY, 6.8, INK, true));
  });
}

function drawBars(commands, items, x, y, w, rowH, title, maxItems = 8) {
  commands.push(textCmd(title, x, y + 14, 11, INK, true));
  const rows = (items || []).slice(0, maxItems);
  const max = Math.max(1, ...rows.map((n) => Number(n.count || 0)));
  rows.forEach((n, i) => {
    const yy = y - 12 - i * rowH;
    commands.push(textCmd(String(n.name || n.bucket || n.label || ''), x, yy + 4, 7.5, INK, true));
    const barX = x + 145;
    const barW = Math.max(2, (Number(n.count || 0) / max) * (w - 195));
    commands.push(rectCmd(barX, yy, w - 195, 12, '#eef2f7'));
    commands.push(rectCmd(barX, yy, barW, 12, PALETTE[i % PALETTE.length]));
    commands.push(textCmd(`${n.count ?? 0} · ${pct(n.percentage)}`, x + w - 48, yy + 4, 7, MUTED, true));
  });
}

export function buildSnapshotPdfPayload(summary) {
  const meta = summary.meta || {};
  const s = summary.summary || {};
  const occ = s.occupancy || {};
  const businessName = meta.businessName || 'Accommodation Business';
  const commands = [];

  addHeader(commands, businessName, meta);
  commands.push(textCmd('Executive overview', 50, 710, 14, INK, true));
  commands.push(textCmd('A visual management snapshot generated from the same server-side analytics dataset as the dashboard.', 50, 694, 8, MUTED));

  kpi(commands, 50, 610, 118, 'CHECK-INS', String(s.totalBookings ?? 0), ORANGE);
  kpi(commands, 178, 610, 118, 'GUESTS', String(s.totalGuests ?? 0), BLUE);
  kpi(commands, 306, 610, 118, 'OCCUPANCY', pct(occ.occupancyRate), TEAL);
  kpi(commands, 434, 610, 111, 'REVENUE', money(s.totalRevenue), GREEN);

  commands.push(textCmd('Visitor mix', 50, 578, 11, INK, true));
  commands.push(textCmd(`South Africa / domestic: ${s.domesticCount ?? 0} (${pct(s.domesticPercentage)})`, 50, 560, 8, MUTED));
  commands.push(textCmd(`International: ${s.internationalCount ?? 0} (${pct(s.internationalPercentage)})`, 50, 546, 8, MUTED));
  commands.push(textCmd(`Average stay: ${s.averageStay ?? 0} nights · Average party: ${s.averagePartySize ?? 0}`, 50, 532, 8, MUTED));

  drawOriginMap(commands, summary.originCountries || []);
  const page1 = { commands };

  const page2 = [];
  addHeader(page2, businessName, meta);
  drawBars(page2, summary.referralData || [], 50, 680, 495, 32, 'How Guests Found You', 8);
  drawBars(page2, summary.lengthOfStay || [], 50, 365, 495, 32, 'Length of Stay', 8);
  drawBars(page2, summary.originCountries || [], 50, 155, 495, 26, 'Top Countries', 10);

  const page3 = [];
  addHeader(page3, businessName, meta);
  page3.push(textCmd('Room performance', 50, 710, 14, INK, true));
  page3.push(textCmd('Utilisation and room-night performance for the selected reporting period.', 50, 694, 8, MUTED));

  const rooms = summary.roomPerformance?.rooms || [];
  const maxUtil = Math.max(1, ...rooms.map((r) => Number(r.utilisation || 0)));
  rooms.slice(0, 12).forEach((room, i) => {
    const yy = 650 - i * 43;
    const label = `${room.roomNumber || ''}${room.roomNumber ? '. ' : ''}${room.roomName || 'Room'}`;
    page3.push(textCmd(label, 50, yy + 12, 8.5, INK, true));
    page3.push(textCmd(room.roomType || '', 50, yy, 6.5, MUTED));
    page3.push(rectCmd(190, yy, 250, 14, '#eef2f7'));
    const bar = Math.max(2, (Number(room.utilisation || 0) / maxUtil) * 250);
    const color = room.performanceBand === 'above' ? GREEN : room.performanceBand === 'below' ? '#dc2626' : ORANGE;
    page3.push(rectCmd(190, yy, bar, 14, color));
    page3.push(textCmd(`${pct(room.utilisation)} · ${room.roomNightsSold || 0} nights`, 450, yy + 3, 7, MUTED, true));
  });
  if (!rooms.length) page3.push(textCmd('Room performance data was not available for this reporting period.', 50, 650, 9, MUTED));
  page3.push(textCmd('Report notes', 50, 110, 11, INK, true));
  page3.push(textCmd(`Occupancy: ${occ.roomNightsSold ?? 0} sold / ${occ.sellableRoomNights ?? 0} sellable room-nights`, 50, 92, 8, MUTED));
  page3.push(textCmd(`Marketing consent: ${pct(s.consentRate)} · Returning guests: ${pct(s.returningRate)}`, 50, 78, 8, MUTED));
  page3.push(textCmd(`Top referral: ${s.topReferral || 'N/A'} · Top month: ${s.topMonth || 'N/A'}`, 50, 64, 8, MUTED));

  return buildVisualPdf([page1, { commands: page2 }, { commands: page3 }], {
    footer: 'Powered by FastCheckIn Analytics · POPIA Compliant · Confidential',
  });
}
