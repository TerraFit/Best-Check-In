# FastCheckIn (Best-Check-In)

**Premium operational platform for independent hospitality businesses.**

FastCheckIn digitises statutory guest check-in (ID capture, digital signatures, POPIA-oriented consent) and expands into operations, analytics, staff tools, and multi-establishment management—packaged so the product grows with the property.

> Brand name in product: **FastCheckIn** · Repository name: **Best-Check-In**

---

## Product overview

| Package | Focus |
|---------|--------|
| **Starter** | Replace paper; compliance; digital reception |
| **Growth** | Daily operations, staff capacity, country insights, housekeeping (roadmap) |
| **Pro** | Professional management: audit, Lost & Found (roadmap), regional analytics, AI recommendations |
| **Business** | **Multi-establishment** management |
| **Enterprise** | API, white label, custom integrations, dedicated support |

Full commercial model: [`docs/PRODUCT/`](./docs/PRODUCT/).

---

## Architecture overview

```text
React (Vite) SPA  →  Netlify Functions  →  Supabase (Postgres + Storage)
                         ↓
              Payments · Email · Gemini AI
```

Details: [`docs/ARCHITECTURE/`](./docs/ARCHITECTURE/).

---

## Technology stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router  
- **Backend:** Netlify Functions  
- **Data:** Supabase  
- **Charts / maps:** Recharts, D3/TopoJSON, Leaflet-related components  
- **AI:** Gemini (via function proxy)  
- **Payments:** Multiple SA-oriented providers (see functions)  

---

## Documentation

**Start here:** [docs/README.md](./docs/README.md)

| Area | Link |
|------|------|
| Product & packages | [docs/PRODUCT/](./docs/PRODUCT/) |
| Feature registry | [docs/PRODUCT/Feature-Registry.md](./docs/PRODUCT/Feature-Registry.md) |
| Architecture | [docs/ARCHITECTURE/](./docs/ARCHITECTURE/) |
| AI agent rules | [docs/AI/](./docs/AI/) |
| Development standards | [docs/DEVELOPMENT/](./docs/DEVELOPMENT/) |
| Roadmap | [docs/PRODUCT/Product-Roadmap.md](./docs/PRODUCT/Product-Roadmap.md) |

---

## Development setup

```bash
npm install
npm run dev
```

Configure environment variables for Supabase and third-party services in your local/Netlify env (never commit secrets).

```bash
npm run build    # production build
npm run preview  # preview build
```

---

## Contribution guidelines

1. Read [docs/AI/](./docs/AI/) if you are an automated agent.  
2. Follow [docs/DEVELOPMENT/](./docs/DEVELOPMENT/).  
3. Update the Feature Registry when adding product features.  
4. Prefer small, reviewed pull requests.  

---

## Roadmap

See [docs/RELEASES/Roadmap.md](./docs/RELEASES/Roadmap.md) and [docs/PRODUCT/Product-Roadmap.md](./docs/PRODUCT/Product-Roadmap.md).

---

## Licence & contact

Proprietary application. Commercial enquiries: use in-product Enterprise contact / sales channels as configured.

---

*Documentation framework v1.0 · July 2026*
