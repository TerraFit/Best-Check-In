# Rate Provider Architecture

## Principle

Rates are **provider-agnostic**. The unified rate model and resolution engine must not depend on Manual vs NightBridge specifics.

```
                    RATE MANAGEMENT
                          |
          +---------------+---------------+
          |                               |
   ManualFastCheckIn              NightBridge (future)
   Provider                       Provider
          |                               |
          +---------------+---------------+
                          |
                   UNIFIED RATE MODEL
                          |
              rateResolutionFoundation
                          |
                booking_rate_snapshots
                          |
                       REVENUE
```

## Why external room IDs are not on room_rates

A rate row describes **price for a room in a season**.  
A mapping row describes **identity linkage to an external system**.

Putting `external_room_id` on every rate would:

- Duplicate identity across many rate rows  
- Couple rate edits to mapping edits  
- Risk inconsistent mappings per rate  

Use `rate_provider_mappings` instead.

## Why snapshots are authoritative

Changing 2027 rates must never alter 2026 booking revenue.  
Nightly immutable snapshots record the exact rate used for each stay date (including multi-season stays).

`bookings.room_revenue` is a derived convenience total only.

## Injectable repository

```
RateRepository (interface)
  └── InMemoryRateRepository   (tests / fixtures)
  └── (future) SupabaseRateRepository via Netlify
```

Resolution and validation are pure and testable without credentials.

## NightBridge (future only)

- Implement `RateProvider`  
- Populate `rate_provider_mappings` with stable external IDs  
- Sync into `business_seasons` / `room_rates` / `rate_specials` with `provider = 'nightbridge'`  
- **Do not invent API endpoints or payloads until verified documentation exists**

## Security

Every list operation is scoped by `businessId`.  
Cross-business references are rejected by DB triggers (migration 013) and domain validation.
