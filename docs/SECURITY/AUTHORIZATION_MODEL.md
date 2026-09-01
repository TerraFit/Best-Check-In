# Authoritative Server-Side Authorization Model

## Purpose

FastCheckIn uses one server-side identity and authorization model for every protected Netlify Function. Frontend route guards and localStorage state are UX mechanisms only; they are never security boundaries.

## Request flow

1. `netlify/functions/_auth.cjs` extracts the Bearer token (or the hardened SuperAdmin HttpOnly session cookie).
2. The JWT is verified with `SUPABASE_JWT_SECRET`, including expiry validation.
3. A canonical principal is created with `actorType`, identity, role, permissions, and tenant (`businessId`).
4. The endpoint applies an explicit permission check.
5. Business-scoped endpoints resolve tenant scope from the principal and reject a conflicting client-supplied `businessId`.
6. Only then may the function use the Supabase service role for the privileged database operation.

## Actor types

- `super_admin`: platform-wide actor; no business tenant is implicitly assigned. A target business must be explicit for cross-tenant platform operations.
- `business`: business owner account; tenant comes from the verified token.
- `employee`: staff account; tenant and employee identity come from the verified token.

The Supabase `service_role` JWT is **not** a human application identity and must never be converted into `super_admin`.

## Required responses

- Missing token: `401`
- Invalid or expired token: `401`
- Valid token, wrong actor/role/permission: `403`
- Valid actor and permission, wrong business scope: `403`
- Valid request: continue to business logic

No protected endpoint may silently elevate an unauthenticated or invalid caller.

## Public endpoints

A public endpoint is an explicit product decision, not an authentication bypass. Public endpoints must document:

- why anonymous access is required;
- the minimum data returned;
- tenant/business validation;
- anti-abuse/rate-limiting requirements;
- whether a short-lived capability/check-in token should replace a permanent public identifier.

Guest check-in remains public by design, but it must not expose unrelated guest or business PII and must validate the target establishment.

## Analytics and commercial entitlements

Analytics authorization has two independent layers:

### Authorization

The authenticated actor must have the relevant server-side permission:

- `canViewPlatformAnalytics` — SuperAdmin platform-wide analytics.
- `canViewOriginAnalytics` — traveller origin analytics (nationality, province, municipality/city/metro, and travel-pattern analysis).
- `canViewEstablishmentPerformance` — establishment performance metrics.

SuperAdmin may access platform analytics across establishments. Business users are always tenant-scoped.

### Product entitlement

For business accounts, role permission alone must not unlock a paid feature. A separate server-side subscription/feature-entitlement check must determine whether the business plan includes the requested analytics feature.

The intended product model is:

- Growth: origin/performance analytics can be a paid feature/add-on where enabled by the commercial configuration.
- Business: the analytics feature can be included as an establishment feature.
- SuperAdmin: platform analytics is an administrative capability and is not subscription-gated.

Do not hard-code plan names into individual endpoints. The eventual entitlement service should resolve `business_id + feature_key + subscription state` centrally.

## Traveller origin analytics data model

The authorization model deliberately anticipates analytics that may expose sensitive or commercially valuable aggregate information, including:

- traveller origin by country/nationality;
- province;
- municipality/city/metro;
- where the traveller stayed the previous night;
- where they are staying the following night;
- stay-pattern and movement analysis;
- establishment performance rate.

Analytics endpoints should return aggregated/minimised data by default. Individual guest identity documents, signatures, phone numbers, or raw identity records must never be exposed merely because an actor has analytics permission.

## Migration rule

Existing function-specific authentication helpers are compatibility adapters during migration. New protected functions must use `_auth.cjs`; existing functions are migrated family-by-family until no independent JWT/tenant implementation remains except deliberately documented compatibility code.
