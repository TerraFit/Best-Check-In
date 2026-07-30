# AI Coding Agents — Start Here

**Mandatory reading** for Grok, ChatGPT, Claude, Cursor agents, and any automated coder working on FastCheckIn.

**Project constitution (root):** [PROJECT_CHARTER.md](../../PROJECT_CHARTER.md)

---

## Documentation First Principle

**FastCheckIn is a documentation-driven project.**

No architectural, commercial, or user-facing feature may be implemented before the relevant documentation has been updated and approved.

Every pull request that introduces a new feature **must** include:

| Requirement | When |
|-------------|------|
| **Feature Registry update** | Always for new or changed features |
| **Feature documentation update** | Always (`docs/FEATURES/` or new file) |
| **Package impact review** | Always (which package unlocks it; soft-lock vs enforce) |
| **Product Decision entry** | If commercial meaning, package boundaries, or architecture policy changes |
| **AI documentation update** | If architecture rules, permissions model, or agent constraints change |

**Order of work for agents and humans:**

1. Update or propose documentation.  
2. Obtain approval (Product Owner / reviewer) where required.  
3. Implement code to match the docs.  
4. Keep docs and code aligned in the same change set when possible.

Code-first changes that invent packages, gates, or user-facing behaviour without docs are **out of process** and should be rejected or converted into a docs-first follow-up before merge.

This single rule keeps the documentation and the codebase aligned.

---

| Document | Purpose |
|----------|---------|
| [Project-Vision.md](./Project-Vision.md) | What we are building |
| [Commercial-Philosophy.md](./Commercial-Philosophy.md) | How packages work |
| [Coding-Rules.md](./Coding-Rules.md) | Hard rules for code |
| [Architecture-Rules.md](./Architecture-Rules.md) | System constraints |
| [Repository-Rules.md](./Repository-Rules.md) | What may be changed |
| [Single-Sources-of-Truth.md](./Single-Sources-of-Truth.md) | Do not duplicate |
| [Package-Permissions.md](./Package-Permissions.md) | Plan access |
| [Feature-Permissions.md](./Feature-Permissions.md) | Feature gates |
| [Adding-Features.md](./Adding-Features.md) | How to add work |
| [Updating-Documentation.md](./Updating-Documentation.md) | Doc duty |
| [Prompting-Guidelines.md](./Prompting-Guidelines.md) | How humans should prompt you |
| [Common-Mistakes.md](./Common-Mistakes.md) | Avoid these |
| [Future-AI-Workflow.md](./Future-AI-Workflow.md) | Target workflow |

## First principles

1. **Documentation First** (see above).  
2. **Docs before code.**  
3. **Do not invent new package names.**  
4. **Business = multi-establishment** (direction), not only higher analytics.  
5. **Soft-lock + educate** on upgrades.  
6. **Backend-enforce** sensitive operations.  
7. **Update Feature Registry** when adding features.  
