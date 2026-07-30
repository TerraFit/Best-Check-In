# Authentication

**Status:** Current Implementation

---

## Actors

| Actor | Mechanism (high level) |
|-------|------------------------|
| Business owner | `business-login` → session in local storage via `src/utils/auth.ts` |
| Employee | `employee-login` / token onboarding |
| Super admin | `super-admin-login` |
| Guest | Generally unauthenticated public check-in scoped by business/link |

## Client storage

`AccessContext` loads business or super_admin session from storage helpers (`getBusinessAuth`, `getSuperAdminAuth`, `getAuth`).

## Gaps / direction

- No central OAuth/SSO (**Enterprise Future Vision**).  
- Subscription not part of auth context yet.  
- Ensure tokens never grant cross-tenant data in functions (always filter by `businessId` + authz).  

See [Permissions.md](./Permissions.md).
