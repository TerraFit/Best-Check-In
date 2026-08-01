import { buildSimplePdf, splitLinesToPages } from './simplePdf.js';

export function buildBiReportPdfPayload(summary) {
  const meta = summary.meta || {};
  const s = summary.summary || {};
  const occ = s.occupancy || {};
  const businessName = meta.businessName || 'Accommodation Business';

  const lines = [
    '## Cover',
    businessName,
    'Business Intelligence Report',
    'Prepared by FastCheckIn Analytics',
    `Reporting Period: ${meta.dateFrom} – ${meta.dateTo}`,
    '',
    '## Executive Summary',
    `Check-ins: ${s.totalBookings ?? 0} · Guests: ${s.totalGuests ?? 0} · Nights: ${s.totalNights ?? 0}`,
    `Occupancy: ${occ.occupancyRate ?? 0}% using room-nights sold / sellable room-nights`,
    `SA vs International: ${s.domesticCount ?? 0} / ${s.internationalCount ?? 0}`,
    `Consent: ${s.consentRate ?? 0}% · Returning: ${s.returningRate ?? 0}%`,
    '',
    '## Occupancy Analysis',
    `Room nights sold: ${occ.roomNightsSold ?? 0}`,
    `Sellable room nights: ${occ.sellableRoomNights ?? 0}`,
    `Sellable rooms: ${occ.sellableRooms ?? 0}`,
    `Days in period: ${occ.daysInPeriod ?? 0}`,
    '',
    '## Guest Demographics & Origins',
    `Unique countries: ${s.uniqueCountries ?? 0}`,
    'Continents:',
    ...(summary.originContinents || []).map((n) => `  ${n.name}: ${n.count} (${n.percentage}%)`),
    'Top countries:',
    ...(summary.originCountries || [])
      .slice(0, 20)
      .map((n) => `  ${n.name}: ${n.count} (${n.percentage}%)`),
    '',
    '## Marketing Consent & Referrals',
    `Consent rate: ${s.consentRate ?? 0}%`,
    ...(summary.referralData || []).map((n) => `  ${n.name}: ${n.count} (${n.percentage}%)`),
    '',
    '## Length of Stay',
    ...(summary.lengthOfStay || []).map(
      (n) => `  ${n.bucket}: ${n.count} (${n.percentage}%)`
    ),
    '',
    '## Seasonal Trends',
    ...(summary.monthlyTrend || []).map((m) => `  ${m.label}: ${m.count} check-ins`),
    '',
    '## Travel Patterns',
    'Arriving from:',
    ...(summary.arrivingFrom || []).map((x) => `  ${x.location}: ${x.count}`),
    'Going to:',
    ...(summary.goingTo || []).map((x) => `  ${x.location}: ${x.count}`),
    '',
    '## Operational Notes',
    'Housekeeping, Lost & Found, and employee activity sections are included when operational data is available in later releases.',
    '',
    '## Recommendations',
    '- Focus marketing on top origin countries and provinces.',
    '- Improve consent capture at check-in where rate is below market expectation.',
    '- Use length-of-stay mix to shape packages and midweek offers.',
    '',
    '## Appendix',
    `Generated: ${meta.generatedAt || new Date().toISOString()}`,
    `Plan: ${meta.plan || 'n/a'}`,
  ];

  const pages = splitLinesToPages(lines, 42);
  pages[0].title = `${businessName}`;

  return buildSimplePdf(pages, {
    subtitle: 'Business Intelligence Report · FastCheckIn Analytics',
    footer: 'Powered by FastCheckIn Analytics · POPIA Compliant · Confidential',
  });
}
