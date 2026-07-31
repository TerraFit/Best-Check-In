# Supabase

**Role:** Primary database and file storage for FastCheckIn.

---

## Usage pattern

Netlify Functions create a Supabase client with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for privileged operations. Browser may use limited client access depending on feature.

## Known logical entities (from code usage)

- `businesses` — tenant profile, plan fields, trial, rooms, branding  
- `entitlements` — trial, complimentary, discounts, promo  
- Bookings / guests (naming may vary in schema)  
- Employees  
- Audit logs  
- Notifications / messaging tables as used by functions  

Exact DDL may live only in Supabase project (not fully mirrored in repo). See [DATABASE/](../DATABASE/) for documentation targets.

## Approved Direction

- Document full schema in-repo.  
- Explicit RLS policies reviewed for tenant isolation.  
- `establishments` (or equivalent) for Business multi-site.  
