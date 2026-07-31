# Single Sources of Truth

| Concern | SSOT |
|---------|------|
| Feature list (docs) | `docs/PRODUCT/Feature-Registry.md` |
| Feature list (runtime) | `src/config/featureRegistry.ts` (+ Netlify mirror) |
| Packages (runtime) | `src/config/packages.ts` (+ Netlify mirror) |
| Feature flags | `src/config/featureFlags.ts` (+ Netlify mirror) |
| Access API | `src/services/featureAccessService.ts` / `netlify/functions/lib/featureAccess.js` |
| Package meaning | `docs/PRODUCT/Commercial-Blueprint.md` |
| Decisions | `docs/PRODUCT/Product-Decisions.md` |
| Agent behaviour | `docs/AI/*` |
| Charter | `PROJECT_CHARTER.md` |

**Never duplicate** long feature bullet lists or price tables in new components; import config.
