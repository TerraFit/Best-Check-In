# Frontend Architecture

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · React Router · Recharts · Lucide · Leaflet/D3 geo (maps)

---

## Entry points

| Path | Role |
|------|------|
| `src/main.tsx` | Bootstrap |
| `src/App.tsx` | Routes |
| `src/pages/*` | Top-level screens |
| `src/components/*` | UI modules |
| `src/hooks/*` | State & data hooks |
| `src/services/*` | Client-side domain services |
| `src/context/AccessContext.tsx` | Auth session (role) |
| `src/i18n/*` | Translations |

## Major UI areas

- Public / marketing home  
- Check-in wizard (`components/checkin/*`)  
- Business dashboard & tabs (`pages/BusinessDashboard.tsx`, `pages/tabs/*`)  
- Staff portal (`components/staff/*`)  
- Reports & visitor origin explorer (`components/analytics/*`)  
- Billing (`pages/Billing.tsx`)  
- Super admin portal  

## State & data

- Local auth helpers in `src/utils/auth.ts`  
- Fetch to `/.netlify/functions/*`  
- AccessContext tracks business vs super_admin—**does not yet hold subscription** (**Approved Direction:** subscription-aware context)

## Notes for contributors

- Prefer existing design tokens (stone/amber).  
- Do not add package hard-coding in components; use future shared config + permission helper.  
- Remove or gate **demo tier switchers** in production analytics paths.  
