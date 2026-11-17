// Shared property-local calendar helpers for housekeeping.
// The property's physical address determines its operational timezone; visitor IP,
// browser locale, billing currency, and server timezone must never override it.

const COUNTRY_TIMEZONES = {
  'south africa': 'Africa/Johannesburg', 'namibia': 'Africa/Windhoek',
  'botswana': 'Africa/Gaborone', 'egypt': 'Africa/Cairo',
  'united kingdom': 'Europe/London', 'uk': 'Europe/London',
  'great britain': 'Europe/London', 'united kingdom of great britain and northern ireland': 'Europe/London',
  'england': 'Europe/London', 'scotland': 'Europe/London', 'wales': 'Europe/London', 'northern ireland': 'Europe/London',
  'angola': 'Africa/Luanda', 'lesotho': 'Africa/Maseru', 'eswatini': 'Africa/Mbabane', 'swaziland': 'Africa/Mbabane',
  'zimbabwe': 'Africa/Harare', 'zambia': 'Africa/Lusaka', 'mozambique': 'Africa/Maputo', 'malawi': 'Africa/Blantyre',
  'tanzania': 'Africa/Dar_es_Salaam', 'mauritius': 'Indian/Mauritius', 'seychelles': 'Indian/Mahe',
  'madagascar': 'Indian/Antananarivo', 'comoros': 'Indian/Comoro', 'democratic republic of congo': 'Africa/Kinshasa',
  'republic of congo': 'Africa/Brazzaville', 'ghana': 'Africa/Accra', 'kenya': 'Africa/Nairobi',
  'nigeria': 'Africa/Lagos', 'uganda': 'Africa/Kampala', 'rwanda': 'Africa/Kigali',
  'new zealand': 'Pacific/Auckland', 'india': 'Asia/Kolkata', 'china': 'Asia/Shanghai',
  'japan': 'Asia/Tokyo', 'singapore': 'Asia/Singapore', 'united arab emirates': 'Asia/Dubai',
  'uae': 'Asia/Dubai', 'saudi arabia': 'Asia/Riyadh', 'france': 'Europe/Paris',
  'germany': 'Europe/Berlin', 'netherlands': 'Europe/Amsterdam', 'spain': 'Europe/Madrid',
  'italy': 'Europe/Rome', 'portugal': 'Europe/Lisbon', 'switzerland': 'Europe/Zurich', 'ireland': 'Europe/Dublin',
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
  PI: 'America/Fortaleza', PIAUI: 'America/Fortaleza', CE: 'America/Fortaleza', CEARA: 'America/Fortaleza',
  RN: 'America/Fortaleza', 'RIO GRANDE DO NORTE': 'America/Fortaleza',
  PB: 'America/Fortaleza', PARAIBA: 'America/Fortaleza',
  PE: 'America/Recife', PERNAMBUCO: 'America/Recife',
  AL: 'America/Maceio', ALAGOAS: 'America/Maceio', SE: 'America/Maceio', SERGIPE: 'America/Maceio',
  DF: 'America/Sao_Paulo', 'DISTRITO FEDERAL': 'America/Sao_Paulo',
  GO: 'America/Sao_Paulo', GOIAS: 'America/Sao_Paulo', MG: 'America/Sao_Paulo', 'MINAS GERAIS': 'America/Sao_Paulo',
  ES: 'America/Sao_Paulo', 'ESPIRITO SANTO': 'America/Sao_Paulo', RJ: 'America/Sao_Paulo', 'RIO DE JANEIRO': 'America/Sao_Paulo',
  SP: 'America/Sao_Paulo', 'SAO PAULO': 'America/Sao_Paulo', PR: 'America/Sao_Paulo', PARANA: 'America/Sao_Paulo',
  SC: 'America/Sao_Paulo', 'SANTA CATARINA': 'America/Sao_Paulo', RS: 'America/Sao_Paulo', 'RIO GRANDE DO SUL': 'America/Sao_Paulo',
};

const US_STATE_TIMEZONES = {
  'NEW YORK':'America/New_York','NY':'America/New_York','NEW JERSEY':'America/New_York','NJ':'America/New_York','MASSACHUSETTS':'America/New_York','MA':'America/New_York',
  'GEORGIA':'America/New_York','GA':'America/New_York','PENNSYLVANIA':'America/New_York','PA':'America/New_York','OHIO':'America/New_York','OH':'America/New_York',
  'ILLINOIS':'America/Chicago','IL':'America/Chicago','MINNESOTA':'America/Chicago','MN':'America/Chicago','WISCONSIN':'America/Chicago','WI':'America/Chicago',
  'COLORADO':'America/Denver','CO':'America/Denver','UTAH':'America/Denver','UT':'America/Denver','NEW MEXICO':'America/Denver','NM':'America/Denver','ARIZONA':'America/Phoenix','AZ':'America/Phoenix',
  'CALIFORNIA':'America/Los_Angeles','CA':'America/Los_Angeles','WASHINGTON':'America/Los_Angeles','WA':'America/Los_Angeles','OREGON':'America/Los_Angeles','OR':'America/Los_Angeles','NEVADA':'America/Los_Angeles','NV':'America/Los_Angeles',
  'ALASKA':'America/Anchorage','AK':'America/Anchorage','HAWAII':'Pacific/Honolulu','HI':'Pacific/Honolulu',
};
const CANADA_PROVINCE_TIMEZONES = {
  'ALBERTA':'America/Edmonton','SASKATCHEWAN':'America/Regina','MANITOBA':'America/Winnipeg',
  'NOVA SCOTIA':'America/Halifax','NEW BRUNSWICK':'America/Moncton','NEWFOUNDLAND AND LABRADOR':'America/St_Johns',
  'PRINCE EDWARD ISLAND':'America/Halifax','YUKON':'America/Whitehorse',
};
const CANADA_CITY_TIMEZONES = {
  'TORONTO':'America/Toronto','OTTAWA':'America/Toronto','MONTREAL':'America/Toronto','QUEBEC CITY':'America/Toronto',
  'VANCOUVER':'America/Vancouver','VICTORIA':'America/Vancouver','KAMLOOPS':'America/Vancouver',
  'WINNIPEG':'America/Winnipeg','REGINA':'America/Regina','SASKATOON':'America/Regina',
  'CALGARY':'America/Edmonton','EDMONTON':'America/Edmonton','HALIFAX':'America/Halifax',
  'FREDERICTON':'America/Moncton','ST JOHNS': 'America/St_Johns','WHITEHORSE':'America/Whitehorse',
  'YELLOWKNIFE':'America/Yellowknife','IQALUIT':'America/Iqaluit',
};
const AUSTRALIA_STATE_TIMEZONES = {
  'NEW SOUTH WALES':'Australia/Sydney','NSW':'Australia/Sydney','VICTORIA':'Australia/Melbourne','VIC':'Australia/Melbourne',
  'QUEENSLAND':'Australia/Brisbane','QLD':'Australia/Brisbane','SOUTH AUSTRALIA':'Australia/Adelaide','SA':'Australia/Adelaide',
  'WESTERN AUSTRALIA':'Australia/Perth','WA':'Australia/Perth','TASMANIA':'Australia/Hobart','TAS':'Australia/Hobart',
  'NORTHERN TERRITORY':'Australia/Darwin','NT':'Australia/Darwin','AUSTRALIAN CAPITAL TERRITORY':'Australia/Sydney','ACT':'Australia/Sydney',
};

function validTimezone(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }); return true; }
  catch { return false; }
}

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

class HousekeepingTimezoneError extends Error {
  constructor(message, code = 'PROPERTY_TIMEZONE_UNRESOLVED') {
    super(message);
    this.name = 'HousekeepingTimezoneError';
    this.code = code;
  }
}

function resolveHousekeepingTimezone(address = {}) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw new HousekeepingTimezoneError('The property physical address is missing. Add the property timezone or complete its physical address.');
  }
  const explicit = address.timezone ?? address.time_zone;
  if (explicit !== undefined && explicit !== null && String(explicit).trim()) {
    if (!validTimezone(explicit)) throw new HousekeepingTimezoneError('The property timezone is invalid. Enter a valid IANA timezone, such as Africa/Johannesburg.', 'PROPERTY_TIMEZONE_INVALID');
    return String(explicit).trim();
  }
  const country = normalized(address.country || address.country_name);
  const province = normalized(address.province || address.state || address.region);
  const city = normalized(address.city);
  if (!country) throw new HousekeepingTimezoneError('The property country is missing. Complete the physical address or set an IANA timezone.');
  if (country === 'BRAZIL' || country === 'BRASIL') {
    const cityZones = {
      'RIO BRANCO':'America/Rio_Branco','CRUZEIRO DO SUL':'America/Rio_Branco',
      'EIRUNEPE':'America/Eirunepe','TEFE':'America/Eirunepe','TABATINGA':'America/Eirunepe',
      'MANAUS':'America/Manaus','PORTO VELHO':'America/Porto_Velho','BOA VISTA':'America/Boa_Vista',
      'CUIABA':'America/Cuiaba','CAMPO GRANDE':'America/Campo_Grande','BELEM':'America/Belem','MACAPA':'America/Belem',
      'FERNANDO DE NORONHA':'America/Noronha',
    };
    const zone = cityZones[city] || BRAZIL_STATE_TIMEZONES[province];
    if (zone) return zone;
    throw new HousekeepingTimezoneError('Brazil spans multiple timezones. Add the property state/city or set its IANA timezone.');
  }
  if (['UNITED STATES','UNITED STATES OF AMERICA','USA','US'].includes(country)) {
    const usCityZones = { 'NEW YORK':'America/New_York','LOS ANGELES':'America/Los_Angeles','SAN FRANCISCO':'America/Los_Angeles','SAN DIEGO':'America/Los_Angeles','SEATTLE':'America/Los_Angeles','CHICAGO':'America/Chicago','DALLAS':'America/Chicago','HOUSTON':'America/Chicago','AUSTIN':'America/Chicago','EL PASO':'America/Denver','PHOENIX':'America/Phoenix','DENVER':'America/Denver','MIAMI':'America/New_York','ORLANDO':'America/New_York','PENSACOLA':'America/Chicago','DETROIT':'America/Detroit','ANCHORAGE':'America/Anchorage','HONOLULU':'Pacific/Honolulu' };
    const zone = usCityZones[city] || US_STATE_TIMEZONES[province];
    if (zone) return zone;
    throw new HousekeepingTimezoneError('The United States spans multiple timezones. Add the property state or set its IANA timezone.');
  }
  if (country === 'CANADA') {
    const zone = CANADA_CITY_TIMEZONES[city] || CANADA_PROVINCE_TIMEZONES[province];
    if (zone) return zone;
    throw new HousekeepingTimezoneError('Canada spans multiple timezones. Add a recognised property city/province or set its IANA timezone.');
  }
  if (country === 'AUSTRALIA') {
    const zone = AUSTRALIA_STATE_TIMEZONES[province];
    if (zone) return zone;
    throw new HousekeepingTimezoneError('Australia spans multiple timezones. Add the property state/territory or set its IANA timezone.');
  }
  const zone = COUNTRY_TIMEZONES[country.toLowerCase()];
  if (zone) return zone;
  throw new HousekeepingTimezoneError('The property timezone could not be determined from its physical address. Set an explicit IANA timezone or complete the regional address details.');
}

function dateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function dateStringInTimezone(date = new Date(), timezone) {
  if (!validTimezone(timezone)) throw new HousekeepingTimezoneError('A valid property timezone is required to calculate housekeeping dates.');
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
function zonedDateTimeToUtc(dateString, timeString, timezone) {
  if (!validTimezone(timezone)) throw new HousekeepingTimezoneError('A valid property timezone is required to calculate housekeeping dates.');
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

function isHousekeepingTaskOverdue(task, today, now = new Date(), timezone) {
  if (!task || !['pending', 'in_progress'].includes(task.status)) return false;
  if (String(task.scheduled_date || '') < today) return true;
  if (String(task.scheduled_date || '') !== today) return false;
  return now >= zonedDateTimeToUtc(today, '14:00:00', timezone);
}

module.exports = {
  resolveHousekeepingTimezone, dateStringInTimezone, addCalendarDays,
  zonedDateTimeToUtc, isHousekeepingTaskOverdue, HousekeepingTimezoneError,
};
