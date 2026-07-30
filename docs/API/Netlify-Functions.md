# Netlify Functions

**Base path:** `/.netlify/functions/<name>`  
**Location:** `netlify/functions/`

## Representative catalogue

| Function | Purpose |
|----------|---------|
| `business-login` | Business authentication |
| `employee-login` | Staff authentication |
| `super-admin-login` | Platform admin |
| `create-booking` | Guest check-in persistence |
| `get-business-bookings` | List bookings |
| `get-subscription-status` | Plan / trial / complimentary |
| `export-marketing-contacts` / `-v2` | Marketing export |
| `export-official-register` | Official register export |
| `manage-employees` | Staff CRUD-style ops |
| `get-audit-logs` / `create-audit-log` | Audit |
| `get-business-branding` | Branding & profile fields |
| `register-business` / `approve-business` | Onboarding |
| Payment webhooks | PayFast, Stripe, etc. |
| `gemini` | AI proxy |

Full file list is in the repository tree. Document new functions here when added.

## Approved Direction

Sensitive functions must call shared feature/plan checks and return structured upgrade errors when denied.
