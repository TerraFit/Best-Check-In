# Adding Features (agent workflow)

**Documentation First** applies. Do not start implementation until steps 1–3 are done (and approved when required).

1. **Feature Registry** — add or update the row (category, package, visibility, status).  
2. **Feature documentation** — create/update `docs/FEATURES/<Feature>.md`.  
3. **Package impact review** — document minimum package, soft-lock vs backend enforcement, upsell message.  
4. **Product Decision** — add `docs/PRODUCT/Product-Decisions.md` entry if commercial or architectural policy changes.  
5. **AI docs** — update `docs/AI/*` if permissions, architecture rules, or agent constraints change.  
6. Implement UI with soft-lock if gated.  
7. Implement API enforcement if sensitive.  
8. Verify docs and code describe the same behaviour in the same PR.  
