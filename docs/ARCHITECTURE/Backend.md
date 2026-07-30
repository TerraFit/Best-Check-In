# Backend Architecture

**Pattern:** Netlify Functions under `netlify/functions/`  
**Data access:** Supabase JS client with service key where privileged  

---

## Conventions

- One function file ≈ one capability (login, export, booking, etc.).  
- CORS headers commonly set per function.  
- Shared helpers in `netlify/functions/_utils.ts`, `lib/supabase-rest.js`.  

## Responsibility split

| Concern | Where |
|---------|--------|
| Guest/booking writes | `create-booking`, check-in related |
| Business auth | `business-login`, `employee-login` |
| Subscription status | `get-subscription-status` |
| Exports | `export-marketing-contacts*`, `export-official-register` |
| Staff | `manage-employees` |
| Audit | `create-audit-log`, `get-audit-logs` |
| Payments | webhooks + PSP functions |
| AI | `gemini.js` |

## Approved Direction

- Shared **feature gate** module used by sensitive functions.  
- Structured error `UPGRADE_REQUIRED` with `requiredPackage`.  
- No reliance on frontend-only checks for exports or seat limits.  

See [API/Netlify-Functions.md](../API/Netlify-Functions.md).
