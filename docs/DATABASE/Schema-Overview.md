# Schema Overview

**Current Implementation:** Schema primarily lives in the Supabase project. Application code references:

- `businesses`  
- `entitlements`  
- Booking/guest related tables  
- Employees  
- Audit logs  
- Messaging / notifications as used  

**Approved Direction:** Maintain an in-repo schema reference and migration history; add `establishments` for multi-property.
