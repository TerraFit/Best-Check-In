// Shared booking stay-date rules.
// CommonJS helper used by the ESM create-booking function.
// The number of nights is the source of truth. Checkout is derived from
// check-in date + nights and must never depend on a client-supplied date.

function parseIsoDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeNights(value) {
  const nights = Number(value);
  if (!Number.isInteger(nights) || nights < 1) return null;
  return nights;
}

function calculateCheckOutDate(checkInDate, nights) {
  const date = parseIsoDate(checkInDate);
  const normalizedNights = normalizeNights(nights);
  if (!date || normalizedNights === null) return null;

  date.setUTCDate(date.getUTCDate() + normalizedNights);
  return formatIsoDate(date);
}

module.exports = {
  parseIsoDate,
  normalizeNights,
  calculateCheckOutDate,
};
