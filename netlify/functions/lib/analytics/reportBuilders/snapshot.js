import { buildSimplePdf, splitLinesToPages } from './simplePdf.js';

export function buildSnapshotPdfPayload(summary) {
  const meta = summary.meta || {};
  const s = summary.summary || {};
  const occ = s.occupancy || {};
  const businessName = meta.businessName || 'Accommodation Business';

  const lines = [
    '## Executive Summary',
    `Business: ${businessName}`,
    `Period: ${meta.dateFrom} to ${meta.dateTo}`,
    `Total check-ins: ${s.totalBookings ?? 0}`,
    `Total guests: ${s.totalGuests ?? 0}`,
    `Average stay: ${s.averageStay ?? 0} nights`,
    `Occupancy: ${occ.occupancyRate ?? 0}% (${occ.roomNightsSold ?? 0} / ${occ.sellableRoomNights ?? 0} room-nights)`,
    `Domestic (SA): ${s.domesticCount ?? 0} (${s.domesticPercentage ?? 0}%)`,
    `International: ${s.internationalCount ?? 0} (${s.internationalPercentage ?? 0}%)`,
    `Marketing consent rate: ${s.consentRate ?? 0}%`,
    `Returning guest rate: ${s.returningRate ?? 0}%`,
    '',
    '## Visitor Origins — Continents',
    ...(summary.originContinents || [])
      .slice(0, 12)
      .map((n) => `${n.name}: ${n.count} (${n.percentage}%)`),
    '',
    '## Top Countries',
    ...(summary.originCountries || [])
      .slice(0, 15)
      .map((n) => `${n.name}: ${n.count} (${n.percentage}%)`),
    '',
    '## Referral Sources',
    ...(summary.referralData || [])
      .slice(0, 10)
      .map((n) => `${n.name}: ${n.count} (${n.percentage}%)`),
    '',
    '## Length of Stay',
    ...(summary.lengthOfStay || []).map(
      (n) => `${n.bucket} nights: ${n.count} (${n.percentage}%)`
    ),
    '',
    '## Business Summary',
    `Top referral: ${s.topReferral || 'N/A'}`,
    `Top month: ${s.topMonth || 'N/A'}`,
    `Average party size: ${s.averagePartySize ?? 0}`,
  ];

  const pages = splitLinesToPages(lines, 42);
  pages[0].title = `${businessName} — Analytics Snapshot`;

  return buildSimplePdf(pages, {
    subtitle: `Prepared by FastCheckIn Analytics · ${meta.dateFrom} – ${meta.dateTo}`,
    footer: 'Powered by FastCheckIn Analytics · POPIA Compliant · Confidential',
  });
}
