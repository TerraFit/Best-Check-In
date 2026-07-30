# Coding Rules (for agents)

0. **Documentation First** — Do not implement architectural, commercial, or user-facing features until the relevant docs are updated (Feature Registry, feature doc, package impact; Product Decision / AI docs when applicable). See [README.md](./README.md).

1. **No application drive-by refactors** unless requested.  
2. **No secrets** in source.  
3. **Tenant isolation** on every query.  
4. **Do not hard-code** plan prices/features in new files—extend toward SSOT.  
5. **Do not add USD** to customer-facing upgrade UI.  
6. **Do not leave demo tier switchers** on production analytics.  
7. **TypeScript** for new UI.  
8. Match existing patterns in the touched folder.  
9. Prefer soft-lock modal over hard navigation removal.  
10. If task is docs-only, touch only `docs/` or README.  
