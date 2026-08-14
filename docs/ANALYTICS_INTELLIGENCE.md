# Analytics Intelligence — Business Rules & Room Performance

## Canonical rules

### Timezone
- Analytics date boundaries use **Africa/Johannesburg**.
- Date params are calendar `YYYY-MM-DD` strings interpreted in that timezone.

### Eligible stays
Included:
- `checked_in`, `checked_out`, and completed-style statuses
- Legacy rows with null/empty status (quality-flagged)

Excluded from sold metrics:
- `cancelled`, `canceled`, `no_show`
- Pre-arrival: `confirmed`, `reserved`, `pending`, `booked`
- Unknown non-empty statuses (prevent silent inflation)

### Nights
- Prefer stored `nights` when > 0
- Else hotel night count: checkout exclusive of occupied nights
- Same-day / missing checkout → 1 night

### Period overlap
A night `N` counts when `check_in <= N < check_out` and `dateFrom <= N <= dateTo`.
Stay count: booking counted if any overlapping night exists.
Property and room **room-nights sold** use overlapping nights only (not full length outside the period).

### Occupancy (MVP)
```
roomNightsSold / (total_rooms × daysInPeriod) × 100
```
- **Not** maintenance-adjusted
- Current room active/OOS state is **not** applied retroactively
- Model label: `mvp_total_rooms`

## Single calculation path
Server modules under `netlify/functions/lib/analytics/` own metrics.
UI consumes APIs (`get-analytics-summary`, `get-visitor-origins`, `get-room-performance`).

## Room Performance
- Historical key: `bookings.room_id`
- Display label: prefer `bookings.room_name` / `room_number` snapshot
- Unallocated stays (`room_id` null): included in property KPIs; excluded from room metrics; coverage % disclosed
- Rankings suppress strong comparison language below 3 stays or 7 room-nights

## Intelligence language
- **FACT** — measured
- **CORRELATION** — associated measured variables
- **INFERENCE** / **RECOMMENDATION** — never presented as fact

## Deferred
- Price vs utilisation / ADR / RevPAR
- Maintenance-adjusted utilisation
- Rich room attribute schema

## Security
- Analytics and room endpoints require Bearer JWT
- `businessId` must match token `user_metadata.business_id`
- Cross-business requests → 403
- RLS: not verified from this repository (external Supabase)

## MapLibre
Geographic engine and layout fix (`w-full h-full` container) are preserved; not redesigned in this work.
