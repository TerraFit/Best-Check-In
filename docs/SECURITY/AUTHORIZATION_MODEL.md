# Authoritative Server-Side Authorization Model

## Purpose

FastCheckIn uses one server-side identity and authorization model for every protected Netlify Function. Frontend route guards and localStorage state are UX mechanisms only; they are never security boundaries.

The model deliberately separates five concerns:

1. **Identity** — who is making the request.
2. **Role** — the person's platform or business responsibility.
3. **Permission** — what operation the role is allowed to perform.
4. **Tenant scope** — which establishment/business the operation may affect.
5. **Feature entitlement** — whether the establishment's subscription includes a commercial feature.

A paid feature must never be unlocked by weakening authorization.

## Request flow

1. `netlify/functions/_auth.cjs` extracts the Bearer token (or the hardened SuperAdmin HttpOnly session cookie).
2. The JWT is verified with `SUPABASE_JWT_SECRET`, including expiry validation.
3. A canonical principal is created with `actorType`, identity, role, permissions, and tenant (`businessId`).
4. The endpoint applies an explicit permission check.
5. Business-scoped endpoints resolve tenant scope from the principal and reject a conflicting client-supplied `businessId`.
6. Only then may the function use the Supabase service role for the privileged database operation.

## Actor types

### Platform actors

Platform personnel are **not** business employees and are not modeled as business owners. Their platform roles are distinct and least-privileged:

- `super_admin` — full platform authority; intended for tightly controlled platform ownership/administration.
- `platform_operations` — business applications, approvals/change requests, account lifecycle and subscription operations.
- `platform_developer` — technical diagnostics and developer/system operations; no business, finance, guest or analytics access by default.
- `platform_finance` — subscriptions, payments and financial/reporting operations.
- `platform_analytics` — cross-establishment analytics and report preparation; analytics/export only, with aggregate/minimised data by default.
- `platform_compliance` — audit/compliance/report access.
- `platform_support` — limited establishment/request visibility for customer support.

Platform roles receive fixed permission sets in `_auth.cjs`. They must not inherit the business-owner permission set.

Platform roles are represented by signed application claims (`platform_role`). User-editable metadata such as `user_metadata.super_admin` is not an elevation mechanism.

### Business actors

- `business` — establishment owner account; tenant comes from the verified identity.
- `employee` — establishment staff account; tenant and employee identity come from the verified identity.

Existing business roles such as manager, supervisor, team leader, housekeeper, front desk, administration, marketing and finance remain business-scoped roles and are governed by the business RBAC matrix in `_rbac.js`.

The Supabase `service_role` JWT is **not** a human application identity and must never be converted into `super_admin`.

## Permission naming

Platform permissions use a namespace that makes their scope explicit:

- `platform:businesses:read`
- `platform:businesses:write`
- `platform:change_requests:read`
- `platform:change_requests:write`
- `platform:subscriptions:read`
- `platform:subscriptions:write`
- `platform:payments:read`
- `platform:analytics:read`
- `platform:analytics:export`
- `platform:reports:read`
- `platform:reports:export`
- `platform:audit:read`
- `platform:compliance:read`
- `platform:developers:manage`
- `platform:system:diagnostics`

Business permissions remain separate, for example `canViewDashboard`, `canManageStaff`, `canViewFinancialReports` and `canViewHousekeeping`.

## Required responses

- Missing token: `401`
- Invalid or expired token: `401`
- Valid token, wrong actor/role/permission: `403`
- Valid actor and permission, wrong business scope: `403`
- Valid request: continue to business logic

No protected endpoint may silently elevate an unauthenticated or invalid caller.

## Tenant scope

Platform actors are platform-wide, but a cross-establishment operation must still have an explicit target `businessId` where one is required. A platform role's lack of an implicit tenant prevents accidental attachment to an establishment.

Business and employee actors are tenant-scoped. If a client supplies a `businessId`, the server must reject it when it conflicts with the authenticated principal's tenant.

Never trust a client-supplied tenant identifier as proof of authorization.

## Public endpoints

A public endpoint is an explicit product decision, not an authentication bypass. Public endpoints must document:

- why anonymous access is required;
- the minimum data returned;
- tenant/business validation;
- anti-abuse/rate-limiting requirements;
- whether a short-lived capability/check-in token should replace a permanent public identifier.

Guest check-in remains public by design, but it must not expose unrelated guest or business PII and must validate the target establishment.

## Analytics and commercial entitlements

Analytics authorization has two independent layers.

### Authorization

The authenticated actor must have the relevant server-side permission. Platform analytics uses `platform:analytics:read`; export is separately controlled by `platform:analytics:export`.

The analytics model anticipates:

- traveller origin by country/nationality;
- province;
- municipality/city/metro;
- where the traveller stayed the previous night;
- where they are staying the following night;
- stay-pattern and movement analysis;
- establishment performance rate.

SuperAdmin may access platform analytics across establishments. `platform_analytics` personnel may do so according to their explicit platform analytics permissions. Business users remain tenant-scoped.

### Product entitlement

For business accounts, role permission alone must not unlock a paid feature. A separate server-side subscription/feature-entitlement check must determine whether the business plan includes the requested analytics feature.

The intended product model is:

- Growth: origin/performance analytics can be a paid feature/add-on where enabled by commercial configuration.
- Business: the analytics feature can be included as an establishment feature.
- SuperAdmin/platform analytics personnel: platform analytics is an administrative capability and is not subscription-gated.

Do not hard-code plan names into individual endpoints. The eventual entitlement service should resolve `business_id + feature_key + subscription state` centrally.

## Data minimisation

Analytics endpoints should return aggregated/minimised data by default. Individual guest identity documents, signatures, phone numbers, or raw identity records must never be exposed merely because an actor has analytics permission.

If a support or compliance workflow genuinely requires raw guest data, it must use a separate explicit permission and an audited workflow rather than broadening analytics permissions.

## Privileged action audit trail

Privileged platform actions should eventually record:

- actor/user ID;
- platform role;
- permission used;
- action;
- target business ID where applicable;
- request/correlation ID;
- timestamp;
- outcome.

Impersonation, if introduced for support, must be a separate explicit, time-limited and audited capability. It must not be implemented by silently changing a user's role.

## Migration rule

Existing function-specific authentication helpers are compatibility adapters during migration. New protected functions must use `_auth.cjs`; existing functions are migrated family-by-family until no independent JWT/tenant implementation remains except deliberately documented compatibility code.
