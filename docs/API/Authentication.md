# API Authentication

**Current:** Function-specific patterns (body/query `businessId`, bearer tokens from client storage where used).  
**Direction:** Consistent auth middleware; never trust client-supplied tenant id without session validation.
