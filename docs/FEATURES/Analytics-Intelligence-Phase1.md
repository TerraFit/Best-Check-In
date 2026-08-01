# Analytics Intelligence Platform — Phase 1

**Branch:** `feature/analytics-intelligence`  
**Status:** Core server + Reports + Explorer integration in progress

## Implemented

### Server (Netlify)

- `lib/analytics/geoHierarchy.js` — single continent/ISO/SA province SSOT
- `lib/analytics/packageGates.js` — drill + PDF entitlements
- `lib/analytics/metrics.js` — occupancy (room-nights), consent, returning, LOS
- `lib/analytics/pipeline.js` — bookings fetch + origin hierarchy + summary
- `get-visitor-origins.js` — drill API with JWT + package gates + 60s cache
- `get-analytics-summary.js` — Reports KPIs + chart series
- `generate-analytics-snapshot.js` — Pro PDF
- `generate-bi-report.js` — Business PDF
- `reportBuilders/*` — structured PDF from JSON (no map screenshots)

### Client

- `src/services/analyticsApi.ts`
- `ReportsTab` — date range, server summary, PDF buttons, no demo controls
- `VisitorOriginExplorer` — server-driven levels, breadcrumbs, Back, city panel
- `CityInsightPanel` — Level 5 metrics
- `getAnalyticsLimits` — Starter locked; Growth country; Pro city; PDF flags

## Package matrix (Phase 1)

| Capability | Starter | Growth | Pro | Business |
|------------|---------|--------|-----|----------|
| KPI dashboard | ✓ | ✓ | ✓ | ✓ |
| Interactive map | Locked | World→Country | →City | ✓ |
| Snapshot PDF | — | — | ✓ | ✓ |
| BI Report PDF | — | — | — | ✓ |

## Default range

90 days.

## Occupancy

`room nights sold / (sellable rooms × days)` — never `bookings / 30`.

## Still open (before merge)

- [ ] Manual QA on Growth/Pro/Business tenants
- [ ] Charts fully driven by summary API (not residual client bookings)
- [ ] Retire `fastcheckin-visitor-explorer` mini-app after parity confirmed
- [ ] Align Feature-Registry.md rows F-022–F-027 statuses
- [ ] Verify Netlify ESM dynamic import of `lib/analytics/*` in production
