# Security

---

## Current posture

- Privileged data access via Netlify + Supabase service key.  
- Business-scoped queries must always include tenant id.  
- POPIA-oriented consent fields on guest data.  
- Audit logging for sensitive staff actions.  

## Risks (from analysis)

- Frontend-only package gates.  
- Export endpoints without plan checks.  
- Dual plan fields.  
- RLS policies not fully documented in-repo.  

## Approved Direction

- Server-side feature and seat enforcement.  
- Document and test RLS.  
- No secrets in client bundles.  
- Enterprise: SSO, harder isolation, audit exports.  
