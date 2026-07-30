// Shared intelligent scheduling engine for Netlify functions (CommonJS mirror)
// Checkout Full Service is independent of mid-stay Refresh schedule.

function parseDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso, days) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Calendar "today" in Africa/Johannesburg (property default timezone). */
function todayInJohannesburg() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function calculateStayLength(checkIn, checkOut) {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function determineCustomNights(nights, settings) {
  const refreshEvery = Math.max(1, settings?.custom_refresh_interval ?? 2);
  const fullEvery = Math.max(1, settings?.custom_full_interval ?? 3);
  const out = [];
  const used = new Set();
  for (let n = fullEvery; n < nights; n += fullEvery) {
    out.push({ nightIndex: n, task_type: 'full_service' });
    used.add(n);
  }
  for (let n = refreshEvery; n < nights; n += refreshEvery) {
    if (!used.has(n)) out.push({ nightIndex: n, task_type: 'refresh' });
  }
  return out.sort((a, b) => a.nightIndex - b.nightIndex);
}

function determineIntelligentNights(nights, policy) {
  const out = [];
  const maxGap = policy === 'eco' ? 3 : 2;
  let lastServiceNight = 0;
  let lastFullNight = 0;

  for (let night = 1; night < nights; night++) {
    const remainingAfter = nights - night;
    if (remainingAfter <= 0) continue;
    const gap = night - lastServiceNight;
    const forceNearEnd = remainingAfter === 1 && gap >= Math.ceil(maxGap / 2) && nights >= 4;
    if (gap < maxGap && !forceNearEnd) continue;

    let task_type = 'refresh';
    if (policy === 'eco') {
      if (night - lastFullNight >= 4 && nights >= 5) task_type = 'full_service';
    } else {
      const isMidpoint = Math.abs(night - nights / 2) <= 1 || gap >= maxGap;
      if ((isMidpoint && nights >= 4) || night - lastFullNight >= 3) task_type = 'full_service';
    }

    out.push({ nightIndex: night, task_type });
    lastServiceNight = night;
    if (task_type === 'full_service') lastFullNight = night;
  }
  return out;
}

function determineOptimalServiceNights(nights, policy, settings) {
  if (nights <= 2) return [];
  if (policy === 'premium') {
    const out = [];
    for (let n = 1; n < nights; n++) out.push({ nightIndex: n, task_type: 'full_service' });
    return out;
  }
  if (policy === 'custom') return determineCustomNights(nights, settings);
  return determineIntelligentNights(nights, policy);
}

/**
 * Generate full schedule for a stay.
 * Checkout Full Service is ALWAYS emitted when there is a valid checkout date,
 * independent of whether any mid-stay Refresh/Full Service exists.
 */
function generateSchedule(checkIn, checkOut, policy, settings) {
  const checkInDate = String(checkIn).slice(0, 10);
  const checkOutDate = String(checkOut).slice(0, 10);
  if (!checkInDate || !checkOutDate) return [];

  const nights = calculateStayLength(checkInDate, checkOutDate);
  const tasks = [];

  // Mid-stay services only when stay has nights to optimise
  if (nights > 0) {
    const mid = determineOptimalServiceNights(nights, policy, settings);
    for (const m of mid) {
      tasks.push({
        scheduled_date: addDays(checkInDate, m.nightIndex),
        task_type: m.task_type,
        is_checkout: false,
        night_index: m.nightIndex,
      });
    }
  }

  // Checkout Full Service — never depends on mid-stay schedule
  // Default mandatory; only skipped if settings explicitly disable AND policy is not premium
  const mandatoryCheckout = settings?.mandatory_checkout_fs !== false;
  if (mandatoryCheckout || policy === 'premium') {
    tasks.push({
      scheduled_date: checkOutDate,
      task_type: 'full_service',
      is_checkout: true,
      night_index: nights,
    });
  }

  // Deduplicate by date (prefer checkout / full_service over refresh)
  const byDate = new Map();
  for (const t of tasks) {
    const existing = byDate.get(t.scheduled_date);
    if (!existing) {
      byDate.set(t.scheduled_date, t);
      continue;
    }
    if (t.is_checkout || (t.task_type === 'full_service' && existing.task_type === 'refresh')) {
      byDate.set(t.scheduled_date, t);
    }
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  );
}

module.exports = {
  calculateStayLength,
  generateSchedule,
  determineOptimalServiceNights,
  todayInJohannesburg,
  formatDate,
};
