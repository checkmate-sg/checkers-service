# Brownfield Project Inputs — CheckMate Checkers Service

> AI-DLC recommends preparing this document for existing (brownfield) projects.
> Hand this to the agent at session start to skip most clarifying questions.
> Update this file whenever significant architectural decisions are made.

---

## Current State

The checkers-service is a production application with real users. It is not a prototype.
Approximately 90-day programme cycles are in progress with active checkers.

**What must not change without explicit approval:**

- The Telegram authentication flow (`initData` HMAC-SHA256 verification)
- The vote consensus algorithm thresholds in `voteAssessment/`
- Database field names on `Checker`, `Poll`, `Vote` documents (no silent migrations)
- Telegram bot command names (`/start`, `/onboard`, `/stop`, `/activate`, `/deactivate`, `/resources`)
- Worker port assignments (9080–9083)
- The `pnpm deploy` step (requires intentional human action)

---

## Existing Technical Decisions (Do Not Re-litigate)

These decisions were made deliberately. Accept them as constraints:

| Decision                                    | Rationale                                                   |
| ------------------------------------------- | ----------------------------------------------------------- |
| MongoDB via dedicated CF Worker, not direct | CF Workers can't hold persistent TCP connections            |
| Durable Objects for MongoDB connection pool | Only stateful primitive available in CF Workers             |
| NextAuth v5 with Telegram credentials       | Telegram initData is the only trusted identity signal       |
| pnpm workspaces monorepo                    | Shared types across workers without publishing packages     |
| OpenNext.js for Next.js on CF Workers       | Next.js App Router has no official CF Workers adapter       |
| Grammy for Telegram bot                     | Mature library with CF Workers compatibility                |
| shadcn/ui component library                 | Already in use — do not introduce competing libraries       |
| Vitest for testing                          | Already configured — do not introduce Jest or other runners |

---

## What IS in Scope for New Features

Contributors are welcome to work on these areas:

- New API routes under `src/app/api/`
- New UI pages under `src/app/`
- New React components in `src/components/`
- New React Query hooks in `src/hooks/`
- New business logic helpers in `src/lib/helpers/`
- New bot commands (after confirming with maintainers)
- New cron job logic in `checkers-event-handler-service` (with maintainer sign-off)
- Bug fixes across any of the above
- Test coverage improvements
- Documentation improvements

---

## Known Issues Available for Contribution

These are explicitly backlogged and safe to implement:

1. **Vote pagination** — `GET /api/checkers/[id]/votes` loads all votes; needs cursor-based pagination
2. **Leaderboard score fix** — current calculation doesn't match the webapp's actual rules
3. **Onboarding verification** — no OTP check or group membership verification (discuss scope before starting)
4. **Dashboard message count** — shows `numReferred` instead of actual WhatsApp messages sent

---

## Environment Setup Checklist

Before starting development:

```bash
git clone https://github.com/checkmate-sg/checkers-service
cd checkers-service
pnpm install
cp .env.example .env.development.local
# Fill in: MongoDB URI, Telegram bot token, NextAuth secret
cp workers/checkers-db-service/.dev.vars.example workers/checkers-db-service/.dev.vars
cp workers/checkers-webhook-service/.dev.vars.example workers/checkers-webhook-service/.dev.vars
# Repeat for other workers as needed
pnpm dev:workers   # Terminal 1
pnpm dev           # Terminal 2 — app at http://localhost:3002
```

---

## Who to Ask

If a feature requires changes to the consensus algorithm, lifecycle logic, Telegram bot commands,
or deployment: open a GitHub Issue and discuss before implementing.
These areas affect live users and require maintainer sign-off before a PR is accepted.
