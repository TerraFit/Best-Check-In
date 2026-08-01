# Analytics Intelligence Platform — Phase 1

**Branch:** `feature/analytics-intelligence`  
**Status:** In progress

## Goals

- Single server-side aggregation pipeline for Reports, Visitor Origin Explorer, charts, and PDFs
- One Leaflet mapping engine
- Package-enforced drill depth (Growth → country, Pro → city)
- Pro Analytics Snapshot PDF; Business BI Report PDF

## Canonical hierarchy

World → Continent → Country → Province/Region → City insight panel

## Server modules

- `netlify/functions/lib/analytics/geoHierarchy.js`
- `netlify/functions/lib/analytics/packageGates.js`
- `netlify/functions/lib/analytics/metrics.js`
- `netlify/functions/lib/analytics/pipeline.js`
- `netlify/functions/get-visitor-origins.js`
- `netlify/functions/get-analytics-summary.js`

## Default date range

90 days.

## Occupancy

Room nights sold / sellable room nights — never completed bookings / 30.
