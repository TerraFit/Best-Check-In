/**
 * Marketing sample PDFs for homepage downloads.
 * Visual language aligned with the FastCheckIn Platform Overview brochure.
 * All figures are illustrative only — not real customer data.
 */
import { buildVisualPdf, textCmd, rectCmd } from './simplePdf.js';

// Platform Overview palette
const STONE_50 = '#fafaf9';
const STONE_100 = '#f5f5f4';
const STONE_200 = '#e7e5e4';
const STONE_500 = '#78716c';
const STONE_600 = '#57534e';
const STONE_700 = '#44403c';
const STONE_800 = '#292524';
const STONE_900 = '#1c1917';
const AMBER = '#d97706';
const AMBER_LIGHT = '#f59e0b';
const TEAL = '#0f766e';
const GOLD = '#a16207';
const GREEN = '#16a34a';
const RED = '#dc2626';
const WHITE = '#ffffff';

const PW = 595;
const PH = 842;
const M = 48;
const CW = PW - M * 2;

function footer(commands, page, total) {
  commands.push(rectCmd(M, 36, CW, 0.6, STONE_200));
  // thin line via rect height 0.6
  commands.push(textCmd('FASTCHECKIN ANALYTICS  ·  ILLUSTRATIVE SAMPLE', M, 22, 7, STONE_500));
  commands.push(textCmd(`PAGE ${page} OF ${total}`, PW - M - 55, 22, 7, STONE_500));
}

function headerBrand(commands, badge) {
  commands.push(rectCmd(0, 0, PW, PH, STONE_50));
  commands.push(textCmd('FastCheckIn', M, 805, 11, STONE_900, true));
  commands.push(textCmd(badge, PW - M - 130, 805, 8, STONE_500));
}

function sectionLabel(commands, text, x, y) {
  commands.push(textCmd(text.toUpperCase(), x, y, 8, AMBER, true));
}

function metricCard(commands, x, y, w, h, label, value, sub, accent) {
  commands.push(rectCmd(x, y, w, h, WHITE, STONE_200));
  commands.push(rectCmd(x + 4, y + h - 3, w - 8, 2.5, accent));
  commands.push(textCmd(value, x + 12, y + h - 32, 18, accent, true));
  commands.push(textCmd(label.toUpperCase(), x + 12, y + h - 46, 7, STONE_500, true));
  if (sub) commands.push(textCmd(sub, x + 12, y + 12, 7.5, STONE_500));
}

/** Visitor Origin Explorer — brochure-aligned illustrative sample */
export function buildVisitorOriginSamplePdf() {
  const p1 = [];
  headerBrand(p1, 'ILLUSTRATIVE SAMPLE DATA');
  sectionLabel(p1, '04 / Market Intelligence', M, 770);
  p1.push(textCmd('Visitor Origin Explorer', M, 745, 20, STONE_900, true));
  p1.push(textCmd('How guest-origin information becomes a clear market view for your property.', M, 726, 9.5, STONE_600));

  // Context strip
  p1.push(rectCmd(M, 690, CW, 26, '#f0fdfa', STONE_200));
  p1.push(textCmd('Illustrative boutique guest house  ·  30-day sample window  ·  Digital check-in origin data', M + 10, 700, 8, STONE_700));

  // KPI cards — brochure figures
  const gap = 10;
  const cardW = (CW - gap * 2) / 3;
  metricCard(p1, M, 600, cardW, 78, 'Europe', '42%', 'Strongest source market', AMBER);
  metricCard(p1, M + cardW + gap, 600, cardW, 78, 'Domestic', '38%', 'South Africa origin share', TEAL);
  metricCard(p1, M + (cardW + gap) * 2, 600, cardW, 78, 'Americas', '14%', 'Secondary long-haul share', GOLD);

  // Hierarchy
  sectionLabel(p1, 'Drill-down hierarchy', M, 575);
  p1.push(rectCmd(M, 540, CW, 28, '#f0f9ff', STONE_200));
  const steps = ['WORLD', 'CONTINENT', 'COUNTRY', 'REGION', 'CITY'];
  let sx = M + 16;
  steps.forEach((s, i) => {
    p1.push(rectCmd(sx, 548, 70, 14, WHITE, TEAL));
    p1.push(textCmd(s, sx + 8, 552, 7.5, TEAL, true));
    sx += 78;
    if (i < steps.length - 1) p1.push(textCmd('→', sx - 12, 552, 9, STONE_500));
  });

  // Ranked origins
  sectionLabel(p1, 'Illustrative country / region ranking', M, 520);
  p1.push(rectCmd(M, 495, CW, 18, STONE_100));
  p1.push(textCmd('ORIGIN', M + 8, 501, 7, STONE_500, true));
  p1.push(textCmd('SHARE', M + 200, 501, 7, STONE_500, true));
  p1.push(textCmd('RELATIVE VOLUME', M + 280, 501, 7, STONE_500, true));

  const rows = [
    ['Germany', '18%', 0.18, AMBER],
    ['Domestic · Gauteng', '22%', 0.22, TEAL],
    ['United Kingdom', '14%', 0.14, AMBER_LIGHT],
    ['United States', '9%', 0.09, GOLD],
  ];
  let y = 470;
  rows.forEach(([name, pct, frac, col]) => {
    p1.push(textCmd(name, M + 8, y, 9, STONE_800));
    p1.push(textCmd(pct, M + 200, y, 9, col, true));
    const barMax = 180;
    p1.push(rectCmd(M + 280, y - 2, barMax, 10, STONE_100));
    p1.push(rectCmd(M + 280, y - 2, barMax * (frac / 0.22), 10, col));
    y -= 28;
  });
  p1.push(textCmd('Countries and regions with no represented volume are intentionally omitted.', M, y + 8, 7.5, STONE_500));

  // Observation
  p1.push(rectCmd(M, 80, CW, 88, STONE_100));
  p1.push(rectCmd(M + 2, 84, 3, 80, STONE_800));
  p1.push(textCmd('MARKET OBSERVATION', M + 14, 150, 8, STONE_800, true));
  p1.push(textCmd('Europe leads the illustrative sample at 42%, with Germany and the UK as notable', M + 14, 132, 8.5, STONE_700));
  p1.push(textCmd('contributors. Domestic volume (38%) remains a core base, concentrated in Gauteng', M + 14, 118, 8.5, STONE_700));
  p1.push(textCmd('in this example. Americas provides a smaller long-haul contribution. Use this', M + 14, 104, 8.5, STONE_700));
  p1.push(textCmd('hierarchy to prioritise direct marketing and evaluate channel mix by source market.', M + 14, 90, 8.5, STONE_700));

  footer(p1, 1, 2);

  // Page 2
  const p2 = [];
  headerBrand(p2, 'ILLUSTRATIVE SAMPLE DATA');
  sectionLabel(p2, 'Using this view', M, 770);
  p2.push(textCmd('From registration address to market clarity.', M, 745, 16, STONE_900, true));
  p2.push(textCmd('Visitor Origin Explorer helps teams understand where demand is already coming from.', M, 726, 9.5, STONE_600));

  const blocks = [
    [AMBER, 'SERVE BETTER', 'Guest origin is captured during digital check-in. Accurate registration data becomes the foundation for every market view that follows.'],
    [TEAL, 'MARKET SMARTER', 'Aggregate origin into continent, country, region and city. Identify which markets already convert and which channels deliver them.'],
    [GOLD, 'GROW WITH INSIGHT', 'Combine origin patterns with occupancy and room performance so commercial decisions are grounded in real guest activity.'],
  ];
  let by = 680;
  blocks.forEach(([col, title, body]) => {
    p2.push(rectCmd(M, by - 70, CW, 78, WHITE, STONE_200));
    p2.push(rectCmd(M + 2, by - 66, 3, 70, col));
    p2.push(textCmd(title, M + 16, by - 12, 9, col, true));
    p2.push(textCmd(body.slice(0, 90), M + 16, by - 32, 9, STONE_700));
    p2.push(textCmd(body.slice(90), M + 16, by - 46, 9, STONE_700));
    by -= 92;
  });

  p2.push(textCmd('This document is an illustrative marketing sample. Figures do not represent a real FastCheckIn customer property.', M, 90, 8, STONE_500));
  p2.push(textCmd('fastcheckin.co.za  ·  inquiry@fastcheckin.co.za  ·  +27 (0)83 778 9487', M, 72, 8, STONE_600));
  footer(p2, 2, 2);

  return buildVisualPdf(
    [{ commands: p1 }, { commands: p2 }],
    { footer: 'FastCheckIn · Illustrative marketing sample · fastcheckin.co.za' }
  );
}

/** Business Snapshot — brochure 10-room guest house scenario */
export function buildBusinessSnapshotSamplePdf() {
  const p1 = [];
  headerBrand(p1, 'FICTITIOUS 10-ROOM SCENARIO');
  sectionLabel(p1, '05 / Business Snapshot', M, 770);
  p1.push(textCmd('Management snapshot', M, 745, 20, STONE_900, true));
  p1.push(textCmd('A concise view of guest demand, occupancy and room performance for a sample period.', M, 726, 9.5, STONE_600));

  p1.push(rectCmd(M, 692, CW, 22, STONE_100));
  p1.push(textCmd('Illustrative 10-room guest house  ·  30-day period  ·  300 available room nights', M + 10, 700, 8, STONE_600));

  const gap = 10;
  const cardW = (CW - gap * 2) / 3;
  metricCard(p1, M, 600, cardW, 78, 'Occupancy rate', '63.2%', '190 / 300 available nights', AMBER);
  metricCard(p1, M + cardW + gap, 600, cardW, 78, 'Total guests', '112', '76 check-in transactions', TEAL);
  metricCard(p1, M + (cardW + gap) * 2, 600, cardW, 78, 'Avg length of stay', '2.50', '190 room nights sold', GOLD);

  sectionLabel(p1, 'Activity summary', M, 575);
  const secs = [['Check-ins', '76'], ['Room nights sold', '190'], ['Available nights', '300'], ['Avg party size', '1.47']];
  secs.forEach(([lab, val], i) => {
    const x = M + i * (CW / 4);
    p1.push(textCmd(val, x, 555, 12, STONE_900, true));
    p1.push(textCmd(lab.toUpperCase(), x, 540, 7, STONE_500));
  });

  sectionLabel(p1, 'Room performance vs property', M, 515);
  p1.push(rectCmd(M, 490, CW, 18, STONE_100));
  p1.push(textCmd('ROOM NAME', M + 8, 496, 7, STONE_500, true));
  p1.push(textCmd('UTILISATION', M + 200, 496, 7, STONE_500, true));
  p1.push(textCmd('VS PROPERTY', M + 290, 496, 7, STONE_500, true));
  p1.push(textCmd('STAYS', M + 390, 496, 7, STONE_500, true));
  p1.push(textCmd('NIGHTS', M + 440, 496, 7, STONE_500, true));

  const rooms = [
    ['Protea Suite 01', '76.67%', '+13.47 pp', GREEN, '9', '23'],
    ['Acacia Garden Room 04', '70.00%', '+6.80 pp', GREEN, '8', '21'],
    ['Olive Suite 02', '63.33%', '+0.13 pp', GREEN, '7', '19'],
    ['Baobab Luxury Tent 09', '46.67%', '-16.53 pp', RED, '5', '14'],
  ];
  let ry = 465;
  rooms.forEach(([name, util, vs, col, stays, nights]) => {
    p1.push(textCmd(name, M + 8, ry, 8.5, STONE_800));
    p1.push(textCmd(util, M + 200, ry, 8.5, STONE_800));
    p1.push(textCmd(vs, M + 290, ry, 8.5, col, true));
    p1.push(textCmd(stays, M + 390, ry, 8.5, STONE_800));
    p1.push(textCmd(nights, M + 440, ry, 8.5, STONE_800));
    ry -= 24;
  });
  p1.push(textCmd('Base: 30-day period. Utilisation = room nights sold ÷ nights available for that unit.', M, ry + 8, 7.5, STONE_500));

  p1.push(rectCmd(M, 80, CW, 78, STONE_100));
  p1.push(rectCmd(M + 2, 84, 3, 70, STONE_800));
  p1.push(textCmd('MANAGEMENT INSIGHT SIGNAL', M + 14, 140, 8, STONE_800, true));
  p1.push(textCmd('While overall property occupancy reached a healthy 63.2%, room performance ranges', M + 14, 122, 8.5, STONE_700));
  p1.push(textCmd('from 76.67% (Protea Suite) down to 46.67% (Baobab Tent). FastCheckIn brings these', M + 14, 108, 8.5, STONE_700));
  p1.push(textCmd('signals together so management can optimise pricing and promotion per unit.', M + 14, 94, 8.5, STONE_700));

  footer(p1, 1, 2);

  const p2 = [];
  headerBrand(p2, 'FICTITIOUS 10-ROOM SCENARIO');
  sectionLabel(p2, 'What this snapshot supports', M, 770);
  p2.push(textCmd('Operational measures in one view.', M, 745, 16, STONE_900, true));

  const blocks = [
    ['GUEST ACTIVITY', 'Check-ins, total guests and average length of stay show how demand converted during the period.'],
    ['OCCUPANCY & ROOM NIGHTS', 'Property-level occupancy sits alongside unit-level utilisation so managers see both the aggregate and the exceptions.'],
    ['ROOM PERFORMANCE', 'Each room is compared to the property average in percentage points. Outliers become visible for pricing or operational attention.'],
    ['COMMERCIAL DIRECTION', 'Combined with Visitor Origin Explorer, these measures support clearer decisions on market focus and unit-level yield.'],
  ];
  let by = 700;
  blocks.forEach(([title, body]) => {
    p2.push(rectCmd(M, by - 62, CW, 70, WHITE, STONE_200));
    p2.push(textCmd(title, M + 14, by - 16, 9, AMBER, true));
    p2.push(textCmd(body.slice(0, 95), M + 14, by - 36, 9, STONE_700));
    p2.push(textCmd(body.slice(95), M + 14, by - 50, 9, STONE_700));
    by -= 82;
  });

  p2.push(textCmd('This document is an illustrative marketing sample. Figures do not represent a real FastCheckIn customer property.', M, 90, 8, STONE_500));
  p2.push(textCmd('fastcheckin.co.za  ·  inquiry@fastcheckin.co.za  ·  +27 (0)83 778 9487', M, 72, 8, STONE_600));
  footer(p2, 2, 2);

  return buildVisualPdf(
    [{ commands: p1 }, { commands: p2 }],
    { footer: 'FastCheckIn · Illustrative marketing sample · fastcheckin.co.za' }
  );
}
