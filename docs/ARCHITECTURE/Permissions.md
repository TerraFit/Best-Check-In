# Permissions

---

## Current Implementation

| Layer | What is enforced |
|-------|------------------|
| Role | Business vs Super Admin vs EmployeeOverview |
| Route guards | `BusinessGuard`, `SuperAdminGuard`, `ProtectedRoute` |
| Package features | Mostly **not** enforced; map drill partial client limits |

## Approved Direction

```text
Role permissions  ×  Package entitlements  ×  Feature gates
```

Conceptual helper:

```text
checkFeatureAccess(featureKey) →
  { allowed, currentPackage, requiredPackage, recommendedPackage, reason }
```

- UI: soft-lock + educational modal  
- API: hard deny or upgrade error code  
- Feature keys from [Feature-Registry.md](../PRODUCT/Feature-Registry.md)  

Staff **seat counts** enforced at invite/create.  
Second **establishment** requires Business (or entitlement override).
