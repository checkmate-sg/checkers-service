# Architecture Constraints Extension

QUESTION: Apply architecture constraint rules for the checkers-service Cloudflare Workers
monorepo? (Covers: DB access patterns, cross-worker boundaries, auth rules, runtime limits.)

OPTIONS:
A) Yes — enforce architecture constraints (required for all features touching services or DB)
B) No — UI-only change, no service or DB interaction involved

DEFAULT: A

ON_SELECT_A: Load extensions/architecture/architecture-constraints.md. Apply all constraints
during design review and code generation. Flag any violation as a blocker.
ON_SELECT_B: Skip. If the scope expands to include service calls, re-enable this extension.
