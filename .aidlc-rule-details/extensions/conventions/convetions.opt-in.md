# Code Conventions Extension

QUESTION: Apply checkers-service coding conventions during construction?
(Covers: TypeScript strict rules, import aliases, React patterns, API route structure,
testing requirements, Tailwind/shadcn-only styling, high-risk areas.)

OPTIONS:
A) Yes — enforce conventions (recommended for all code changes)
B) No — documentation or config-only change, no source code involved

DEFAULT: A

ON_SELECT_A: Load extensions/conventions/conventions.md before any code generation.
Treat convention violations as review blockers, not suggestions.
ON_SELECT_B: Skip for this session.
