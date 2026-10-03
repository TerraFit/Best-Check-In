import { buildSimplePdf } from './lib/analytics/reportBuilders/simplePdf.js';

const PDF_HEADERS = {
  'Content-Type': 'application/pdf',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const JSON_HEADERS = { ...PDF_HEADERS, 'Content-Type': 'application/json' };

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const pdfResponse = (buffer) => ({
  statusCode: 200,
  headers: PDF_HEADERS,
  body: buffer.toString('base64'),
  isBase64Encoded: true,
});

const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);

function validateLead(lead) {
  const fields = ['fullName', 'companyName', 'email', 'telephone', 'address'];
  if (!lead || fields.some((field) => !clean(lead[field]))) return 'Please complete all required fields.';
  if (!/^\S+@\S+\.\S+$/.test(clean(lead.email))) return 'Please enter a valid email address.';
  return null;
}

const brochurePages = () => [
  { title: 'FastCheckIn', lines: [
    'Transform Your Check-In Experience.',
    'Know Your Guests. Know Your Market. Sell More.',
    '',
    'A connected digital platform for hotels, guest houses and accommodation establishments.',
    '## Guest experience',
    'Digital check-in, ID capture, digital signatures, guest registration and useful guest information.',
    '## Hotel operations',
    'Arrivals, current stays, departures, rooms, housekeeping and operational follow-up.',
    '## Compliance support',
    'POPIA-conscious workflows, digital indemnities, ID capture and statutory guest registration support.',
    '## Analytics',
    'Understand visitor origins, travel patterns, occupancy and operational performance.',
  ]},
  { title: 'Serve Better', lines: [
    '## Know your guests',
    'Capture useful information during the guest journey so your team can provide a more informed experience.',
    '',
    '## Guest information',
    '- Dietary and food restrictions',
    '- Country and place of origin',
    '- Arriving-from and next-destination information',
    '- Referral source and stay information',
    '',
    '## Connected operations',
    'Bring guest information together with arrivals, stays, rooms and housekeeping workflows.',
  ]},
  { title: 'Market Smarter', lines: [
    '## Know your market',
    'Visitor Origin Explorer turns guest-origin information into a market view.',
    '',
    'Explore countries, regions, continents and cities.',
    '',
    'Use actual guest-origin information from your property to understand which markets are already finding you.',
  ]},
  { title: 'Grow With Insight', lines: [
    '## Find your direction',
    'Business Snapshot reporting brings key measures together for a concise view of property performance.',
    '',
    'Typical measures include check-ins, guests, occupancy, room nights, visitor mix and optional financial information.',
    '',
    'FastCheckIn connects guest experience, operations and analytics in one platform.',
  ]},
];

const visitorOriginPages = () => [
  { title: 'Visitor Origin Explorer', lines: [
    'FastCheckIn Analytics - Illustrative Sample',
    '',
    '## Guest check-ins',
    '122 guest check-ins',
    '',
    '## Example market view',
    'Europe                         68%',
    'Sub-Saharan Africa             47%',
    'North America                  31%',
    'Oceania                        18%',
    '',
    'These figures are illustrative sample data only and do not represent a real property.',
  ]},
  { title: 'Explore the market', lines: [
    '## From continent to city',
    'FastCheckIn analytics can progressively explore visitor-origin information.',
    '',
    'World -> Continent -> Country -> Region -> City',
    '',
    'The purpose is to help accommodation businesses understand where their guests are coming from and identify markets worth investigating.',
  ]},
  { title: 'Travel patterns', lines: [
    '## Understand the journey',
    'Guest check-in information can include where a guest travelled from and where they are travelling next.',
    '',
    'This creates additional context around source markets, regional travel patterns, multi-destination journeys and potential targeting opportunities.',
  ]},
];

const businessSnapshotPages = () => [
  { title: 'Business Snapshot', lines: [
    'FastCheckIn Analytics - Illustrative Sample',
    '',
    '## Operational reporting',
    'A concise view of key measures for a selected reporting period.',
    '',
    'Check-ins                     57',
    'Guests                       122',
    'Occupancy                   13.2%',
    'Room nights                   71',
    '',
    'These figures are illustrative sample data only and do not represent a real property.',
  ]},
  { title: 'Business Snapshot', lines: [
    '## What the snapshot brings together',
    'Guest activity',
    'Occupancy and room-night measures',
    'Visitor mix',
    'Operational indicators',
    'Optional financial information supplied by the business',
    '',
    'The objective is to provide a clearer picture of property performance and direction at a glance.',
  ]},
  { title: 'From information to action', lines: [
    '## Grow With Insight',
    'FastCheckIn connects information generated by guest interaction and hotel operations.',
    '',
    'Know Your Guests.',
    'Know Your Market.',
    'Sell More.',
  ]},
];

const escapeHtml = (value) => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

async function notifyLead(lead, document) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured; resource generated without email notification.');
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const documentLabel = document === 'brochure' ? 'FastCheckIn Brochure' : document === 'visitor-origin' ? 'Visitor Origin Explorer Snapshot' : 'Business Snapshot';
    const html = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn resource download</h2>' +
      '<p><strong>Resource:</strong> ' + documentLabel + '</p>' +
      '<p><strong>Name:</strong> ' + escapeHtml(lead.fullName) + '</p>' +
      '<p><strong>Company / hotel:</strong> ' + escapeHtml(lead.companyName) + '</p>' +
      '<p><strong>Email:</strong> ' + escapeHtml(lead.email) + '</p>' +
      '<p><strong>Telephone:</strong> ' + escapeHtml(lead.telephone) + '</p>' +
      '<p><strong>Address:</strong> ' + escapeHtml(lead.address) + '</p></div>';
    await resend.emails.send({
      from: 'FastCheckin <notifications@fastcheckin.co.za>',
      to: ['inquiry@fastcheckin.co.za'],
      subject: 'Homepage resource download: ' + documentLabel,
      html,
    });
  } catch (error) {
    console.error('Homepage lead notification failed:', error);
  }
}

async function notifyInquiry(lead, topic, comments) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured; inquiry cannot be notified by email.');
    return false;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn website enquiry</h2>' +
      '<p><strong>Topic:</strong> ' + escapeHtml(topic) + '</p>' +
      '<p><strong>Name:</strong> ' + escapeHtml(lead.fullName) + '</p>' +
      '<p><strong>Company / hotel:</strong> ' + escapeHtml(lead.companyName) + '</p>' +
      '<p><strong>Email:</strong> ' + escapeHtml(lead.email) + '</p>' +
      '<p><strong>Telephone:</strong> ' + escapeHtml(lead.telephone) + '</p>' +
      '<p><strong>Address:</strong> ' + escapeHtml(lead.address) + '</p>' +
      '<p><strong>Comments:</strong><br>' + escapeHtml(comments) + '</p></div>';
    await resend.emails.send({
      from: 'FastCheckin <notifications@fastcheckin.co.za>',
      to: ['inquiry@fastcheckin.co.za'],
      subject: 'FastCheckIn website enquiry: ' + clean(topic, 120),
      html,
    });
    return true;
  } catch (error) {
    console.error('Homepage enquiry notification failed:', error);
    return false;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  if (body.action === 'inquiry') {
    const leadError = validateLead(body.lead);
    if (leadError) return jsonResponse(400, { error: leadError });
    const topic = clean(body.topic, 160);
    const comments = clean(body.comments, 3000);
    if (!topic || !comments) return jsonResponse(400, { error: 'Please select a topic and enter your comments.' });
    const lead = {
      fullName: clean(body.lead.fullName),
      companyName: clean(body.lead.companyName),
      email: clean(body.lead.email, 320),
      telephone: clean(body.lead.telephone, 80),
      address: clean(body.lead.address),
    };
    const notified = await notifyInquiry(lead, topic, comments);
    if (!notified) return jsonResponse(503, { error: 'The enquiry service is temporarily unavailable. Please email sales@fastcheckin.co.za.' });
    return jsonResponse(200, { success: true });
  }

  if (body.action !== 'download') return jsonResponse(400, { error: 'Unsupported action' });
  const document = ['brochure', 'visitor-origin', 'business-snapshot'].includes(body.document) ? body.document : null;
  if (!document) return jsonResponse(400, { error: 'Unsupported document' });

  const leadError = validateLead(body.lead);
  if (leadError) return jsonResponse(400, { error: leadError });

  const lead = {
    fullName: clean(body.lead.fullName),
    companyName: clean(body.lead.companyName),
    email: clean(body.lead.email, 320),
    telephone: clean(body.lead.telephone, 80),
    address: clean(body.lead.address),
  };

  await notifyLead(lead, document);

  if (document === 'brochure') {
    return {
      statusCode: 302,
      headers: {
        ...PDF_HEADERS,
        Location: '/FastCheckIn_Platform_Overview_Brochure.pdf',
      },
      body: '',
    };
  }

  const pages = document === 'visitor-origin' ? visitorOriginPages() : businessSnapshotPages();
  const subtitle = document === 'brochure' ? 'FastCheckIn - Platform Overview' : document === 'visitor-origin' ? 'FastCheckIn Analytics - Visitor Origin Explorer' : 'FastCheckIn Analytics - Business Snapshot';
  return pdfResponse(buildSimplePdf(pages, { subtitle, footer: 'FastCheckIn - Illustrative marketing sample - fastcheckin.co.za' }));
};
