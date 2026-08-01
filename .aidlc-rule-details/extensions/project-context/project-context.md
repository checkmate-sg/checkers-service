# CheckMate Checkers Service — Project Context

> AI-DLC Extension: loaded during workspace detection and requirements analysis.
> This file gives the agent foundational project knowledge so it does not need to
> discover it by reading source files or ask questions that are already answered here.

---

## What This Project Is

A Telegram MiniApp for crowd-sourced fact-checking. Trained volunteer "checkers" receive
forwarded messages via Telegram and vote to classify them as scams, misinformation, spam,
or legitimate. The consensus result is returned to the CheckMate platform.

**Live users**: real volunteers. Changes to auth, voting, or lifecycle flows affect people
currently enrolled in the programme.

---

## Tech Stack

| Layer           | Technology                                            |
| --------------- | ----------------------------------------------------- |
| Frontend        | Next.js 15 (App Router), React 18, TypeScript         |
| Styling         | Tailwind CSS, shadcn/ui                               |
| Auth            | NextAuth v5, Telegram `initData` HMAC-SHA256          |
| Database        | MongoDB Atlas — accessed ONLY via checkers-db-service |
| Workers         | Cloudflare Workers (4 workers, pnpm workspaces)       |
| Deployment      | OpenNext.js on Cloudflare Workers                     |
| Package manager | pnpm v10+ with workspaces                             |
| Tests           | Vitest                                                |
| Bot             | Grammy (Telegram Bot API)                             |

---

## Monorepo Structure

```
checkers-service/
├── src/                          # Next.js app
│   ├── app/
│   │   ├── api/                  # API routes (HTTP only — no business logic here)
│   │   ├── dashboard/
│   │   ├── leaderboard/
│   │   └── votes/
│   ├── components/               # React components
│   ├── hooks/                    # React Query hooks (all client data fetching)
│   ├── lib/
│   │   ├── auth.config.ts        # NextAuth config
│   │   └── helpers/              # Business logic lives here
│   │       └── voteAssessment/   # Consensus calculation — HIGH RISK area
│   └── contexts/
├── shared/
│   └── types/schema.ts           # ALL shared TypeScript types — single source of truth
├── workers/
│   ├── checkers-db-service/      # port 9080 — MongoDB connection pooling via DO
│   ├── checkers-webhook-service/ # port 9083 — Telegram bot + inbound webhooks
│   ├── checkers-event-handler-service/ # port 9082 — queue consumer + daily crons
│   └── checkers-reminder-alarm-service/ # port 9081 — Durable Object alarms
├── docs/
│   └── dev-harness/              # AI developer harness docs
├── tests/                        # Vitest unit tests (mirror src/ structure)
├── CLAUDE.md                     # AI-DLC core workflow (do not edit)
└── .aidlc-rule-details/          # AI-DLC rule details + project extensions
```

---

## Commands

```bash
pnpm install          # Install all workspaces
pnpm dev              # Start Next.js on port 3002
pnpm dev:workers      # Start all 4 CF workers in parallel
pnpm test             # Run Vitest unit tests
pnpm lint             # ESLint
pnpm build            # Next.js + workers build (includes tsc)
pnpm deploy           # Deploy to Cloudflare — REQUIRES human approval first
```

---

## Domain Vocabulary

Use these terms consistently — they have specific meanings in this codebase:

| Term          | Meaning                                                               |
| ------------- | --------------------------------------------------------------------- |
| **Checker**   | A volunteer fact-checker enrolled in the programme                    |
| **Poll**      | A message submitted for fact-checking (contains text or image)        |
| **Vote**      | A checker's assessment of a poll (category + optional truth score)    |
| **Consensus** | When enough votes agree — auto-calculated, triggers result dispatch   |
| **Programme** | A 90-day enrolment cycle with activity targets                        |
| **Lifecycle** | The automated flow of warning → deactivation → reminder → offboarding |
| **initData**  | Telegram's signed payload used to authenticate the MiniApp user       |

---

## Known Existing Issues (Do Not Re-introduce)

These are tracked in the repo's GitHub Issues. Do not design features that make them worse:

- Dashboard "messages sent" count uses `numReferred`, not actual WhatsApp messages sent
- Votes page has no pagination (loads all votes) — a known performance issue
- Onboarding does not verify OTP or check actual group membership
- Leaderboard score calculation does not follow current rules
- API calls use JWT to pull user data (server-side session fetch would be better)
