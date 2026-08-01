# Project Context Extension

QUESTION: This is an existing (brownfield) project with a specific stack and architecture.
Load the project context rules to avoid re-discovering known constraints?

OPTIONS:
A) Yes — load project-context.md (recommended for all contributors)
B) No — I already know the project well and want minimal overhead

DEFAULT: A

ON_SELECT_A: Load extensions/project-context/project-context.md immediately.
ON_SELECT_B: Skip. Note that architecture constraints in extensions/architecture/ still apply.
