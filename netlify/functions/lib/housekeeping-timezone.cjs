// Shared property-local calendar helpers for housekeeping.
// The property's physical address determines its operational timezone; visitor IP,
// browser locale, billing currency, and server timezone must never override it.

const COUNTRY_TIMEZONES = {
  'south africa': 'Africa/Johannesburg',
  'namibia': 'Africa/Windhoek',
  'botswana': 'Africa/Gaborone',
  'egypt': 'Africa/Cairo',
  'united kingdom': 'Europe/London',
  'uk': 'Europe/London',
  'great britain': 'Europe/London',
  'united kingdom of great britain and northern ireland': 'Europe/London',
  'england': 'Europe/London',
  'scotland': 'Europe/London',
  'wales': 'Europe/London',
  'northern ireland': 'Europe/London',
  'brazil': 'America/Sao_Paulo',
  'brasil': 'America/Sao_Paulo',
  'angola': 'Africa/Luanda',
  'lesotho': 'Africa/Maseru',
  'eswatini': 'Africa/Mbabane',
  'swaziland': 'Africa/Mbabane',
  'zimbabwe': 'Africa/Harare',
  'zambia': 'Africa/Lusaka',
  'mozambique': 'Africa/Maputo',
  'malawi': 'Africa/Blantyre',
  'tanzania': 'Africa/Dar_es_Salaam',
  'mauritius': 'Indian/Mauritius',
  'seychelles': 'Indian/Mahe',
  'madagascar': 'Indian/Antananarivo',
  'comoros': 'Indian/Comoro',
  'democratic republic of congo': 'Africa/Kinshasa',
  'republic of congo': 'Africa/Brazzaville',
  'ghana': 'Africa/Accra',
  'kenya': 'Africa/Nairobi',
  'nigeria': 'Africa/Lagos',
  'uganda': 'Africa/Kampala',
  'rwanda': 'Africa/Kigali',
  'united states': 'America/New_York',
  'usa': 'America/New_York',
  'canada': 'America/Toronto',
  'australia': 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland',
  'india': 'Asia/Kolkata',
  'china': 'Asia/Shanghai',
  'japan': 'Asia/Tokyo',
  'singapore': 'Asia/Singapore',
  'united arab emirates': 'Asia/Dubai',
  'uae': 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  'france': 'Europe/Paris',
  'germany': 'Europe/Berlin',
  'netherlands': 'Europe/Amsterdam',
  'spain': 'Europe/Madrid',
  'italy': 'Europe/Rome',
  'portugal': 'Europe/Lisbon',
  'switzerland': 'Europe/Zurich',
  'ireland': 'Europe/Dublin',
};

const BRAZIL_STATE_TIMEZONES = {
  AC: 'America/Rio_Branco', ACRE: 'America/Rio_Branco',
  RO: 'America/Porto_Velho', RONDONIA: 'America/Porto_Velho',
  RR: 'America/Boa_Vista', RORAIMA: 'America/Boa_Vista',
  AM: 'America/Manaus', AMAZONAS: 'America/Manaus',
  MT: 'America/Cuiaba', 'MATO GROSSO': 'America/Cuiaba',
  MS: 'America/Campo_Grande', 'MATO GROSSO DO SUL': 'America/Campo_Grande',
  PA: 'America/Belem', PARA: 'America/Belem', AP: 'America/Belem', AMAPA: 'America/Belem',
  TO: 'America/Araguaina', TOCANTINS: 'America/Araguaina',
  BA: 'America/Bahia', BAHIA: 'America/Bahia',
  MA: 'America/Fortaleza', MARANHAO: 'America/Fortaleza',
  PI: 'America/Fortaleza', PIAUI: 'America/Fortaleza',
  CE: 'America/Fortaleza', CEARA: 'America/Fortaleza',
  RN: 'America/Fortaleza', 'RIO GRANDE DO NORTE': 'America/Fortaleza',
  PB: 'America/Fortaleza', PARAIBA: 'America/Fortaleza',
  PE: 'America/Recife', PERNAMBUCO: 'America/Recife',
  AL: 'America/Maceio', ALAGOAS: 'America/Maceio',
  SE: 'America/Maceio', SERGIPE: 'America/Maceio',
  DF: 'America/Sao_Paulo', 'DISTRITO FEDERAL': 'America/Sao_Paulo',
  GO: 'America/Sao_Paulo', GOIAS: 'America/Sao_Paulo',
  MG: 'America/Sao_Paulo', 'MINAS GERAIS': 'America/Sao_Paulo',
  ES: 'America/Sao_Paulo', 'ESPIRITO SANTO': 'America/Sao_Paulo',
  RJ: 'America/Sao_Paulo', 'RIO DE JANEIRO': 'America/Sao_Paulo',
  SP: 'America/Sao_Paulo', 'SAO PAULO': 'America/Sao_Paulo',
  PR: 'America/Sao_Paulo', PARANA: 'America/Sao_Paulo',
  SC: 'America/Sao_Paulo', 'SANTA CATARINA': 'America/Sao_Paulo',
  RS: 'America/Sao_Paulo', 'RIO GRANDE DO SUL': 'America/Sao_Paulo',
};

function validTimezone(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }); return true; }
  catch { return false; }
}

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function resolveHousekeepingTimezone(address = {}) {
  if (validTimezone(address.timezone || address.time_zone)) return (address.timezone || address.time_zone).trim();
  const country = normalized(address.country || address.country_name);
  if (country === 'BRAZIL' || country === 'BRASIL') {
    const province = normalized(address.province || address.state || address.region);
    const city = normalized(address.city);
    if (city === 'RIO BRANCO' || city === 'CRUZEIRO DO SUL') return 'America/Rio_Branco';
    if (city === 'EIRUNEPE' || city === 'TEFE' || city === 'TABATINGA') return 'America/Eirunepe';
    if (city === 'MANAUS') return 'America/Manaus';
    if (city === 'PORTO VELHO') return 'America/Porto_Velho';
    if (city === 'BOA VISTA') return 'America/Boa_Vista';
    if (city === 'CUIABA') return 'America/Cuiaba';
    if (city === 'CAMPO GRANDE') return 'America/Campo_Grande';
    if (city === 'BELEM' || city === 'MACAPA') return 'America/Belem';
    if (city === 'FERNANDO DE NORONHA') return 'America/Noronha';
    return BRAZIL_STATE_TIMEZONES[province] || COUNTRY_TIMEZONES.brazil;
  }
  return COUNTRY_TIMEZONES[country.toLowerCase()] || 'Etc/UTC';
}

function dateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function dateStringInTimezone(date = new Date(), timezone = 'Etc/UTC') {
  const parts = dateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

// Convert a wall-clock time in an IANA timezone to a UTC Date. Iterative offset
// correction handles DST offsets without assuming a fixed UTC offset.
function zonedDateTimeToUtc(dateString, timeString, timezone = 'Etc/UTC') {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute, second = 0] = timeString.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = dateParts(new Date(guess), timezone);
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    const correction = target - represented;
    if (!correction) break;
    guess += correction;
  }
  return new Date(guess);
}

module.exports = { resolveHousekeepingTimezone, dateStringInTimezone, addCalendarDays, zonedDateTimeToUtc };
