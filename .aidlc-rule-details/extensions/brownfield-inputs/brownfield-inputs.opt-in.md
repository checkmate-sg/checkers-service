# Brownfield Project Context Extension

QUESTION: Load the existing project's technical decisions, constraints, and known issues?
(This is an existing production application — loading this skips most clarifying questions
about the current state and prevents re-litigating settled design decisions.)

OPTIONS:
A) Yes — load brownfield context (recommended for all sessions, especially for new contributors)
B) No — I am a maintainer and already have full context

DEFAULT: A

ON_SELECT_A: Load extensions/brownfield-inputs/brownfield-inputs.md immediately.
Treat all "must not change" items as hard constraints equivalent to architecture rules.
ON_SELECT_B: Skip.
