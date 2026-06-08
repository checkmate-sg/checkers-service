# CheckMate Checkers Service

A Telegram miniapp for crowd-sourcing fact-checking of messages. Trained checkers vote on messages forwarded from the CheckMate platform to determine if they're scams, misinformation, spam, or legitimate.

## How It Works (End-to-End Business Flow)

This service is the **community fact-checking layer** of CheckMate. The wider CheckMate platform lets members of the public forward suspicious messages (typically via WhatsApp); this service is where a trained volunteer crowd decides what those messages actually are, and sends the verdict back. The whole point is to turn "is this a scam?" into a fast, reliable, crowd-sourced answer.

The journey of a single message:

1. **Intake.** CheckMate receives a suspicious message and forwards it here as a "check" (via the poll webhook). It becomes a **poll** — the unit of work checkers vote on. Messages can be plain text or an image, and may carry an AI-drafted reply for checkers to rate.
2. **Distribution.** The poll is handed to a fair share of active, trained checkers — not everyone — with each checker capped at a daily number of assignments. Each assigned checker gets a Telegram notification linking to the voting screen. (See [Vote Distribution Engine](#vote-distribution-engine).)
3. **Voting.** A checker opens the miniapp and categorises the message — scam, misinformation (with a 0–5 truth score), spam, legitimate, irrelevant, satire, or unsure — and can also rate the AI-drafted reply as great / acceptable / unacceptable.
4. **Continuous assessment.** As votes arrive, the system keeps recalculating whether a **confident majority** has formed. How many votes are "enough" depends on how clear-cut the message is — an obvious scam settles with only a handful of votes, while ambiguous cases need many more. Until a poll reaches its target, redistribution tops it up with more checkers through the day. (See [Vote Assessment Logic](#vote-assessment-logic).)
5. **Verdict.** Once a poll is assessed, its crowd-sourced category and truth score — plus whether the AI reply was rejected ("downvoted") — are finalised and made available back to CheckMate, which uses them to respond to the original user.
6. **Checker engagement (runs in parallel).** Underneath all of this, the programme manages the volunteer's lifecycle so the crowd stays healthy: onboarding new checkers, balancing daily workload, nudging the inactive, tracking programme milestones, and graduating those who complete it (with a shareable certificate). (See [Checker Lifecycle Management](#checker-lifecycle-management).)

**Why it's built this way:** accuracy comes from the crowd, but volunteer attention is scarce — so the system optimises for _enough_ high-quality votes per message while spreading the load fairly and keeping volunteers engaged over time.

## Tech Stack

- **Frontend**: NextJS 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn-ui
- **Auth**: NextAuthV5 with Telegram credentials
- **Database**: MongoDB via Cloudflare Worker service
- **Telegram**: Bot (Grammy) + MiniApp (@twa-dev/sdk)
- **Deployment**: OpenNextJS/Cloudflare Workers

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── polls/[id]          # Poll details + results
│   │   ├── votes/[voteId]      # Vote fetch/submission
│   │   ├── checkers/           # Checker profiles
│   │   └── telegram/webhook    # Bot commands + reactivation callback
│   ├── dashboard/              # Progress tracking page
│   ├── leaderboard/            # Rankings page
│   └── votes/                  # Voting interface
├── components/                 # React components
├── hooks/                      # React Query hooks
├── lib/
│   ├── auth.config.ts          # NextAuth config
│   └── helpers/voteAssessment/ # Consensus calculation
└── contexts/                   # UserContext
shared/
├── types/schema.ts             # DB schemas (Checker, Poll, Vote)
├── constants.ts                # Shared constants (e.g. MIN_VOTES_NEEDED)   ← incoming with the Vote Distribution Engine (branch 157)
└── helpers/
    ├── distributor/            # Vote-assignment engine (state machine + rollback)  ← incoming with branch 157
    └── voteAssessment.ts       # Consensus calculation (shared)
workers/
├── checkers-db-service/        # Cloudflare Worker for MongoDB (RPC entrypoint)
├── checkers-event-handler-service/  # Queue consumer + cron jobs (lifecycle, daily-budget reset, redistribution)
├── checkers-reminder-alarm-service/ # Durable Object alarms for reminders
└── checkers-webhook-service/   # Telegram, poll, Typeform & stats webhooks (WorkerEntrypoint with RPC); triggers initial vote distribution
```

## Core Features

### Authentication

- Telegram WebApp `initData` verified via HMAC-SHA256
- JWT sessions (30-day), secure cookies
- Protected routes (enforced in `src/middleware.ts`): `/dashboard`, `/leaderboard`, `/my-votes`, `/vote`, `/votepage`

### Voting System

- **Categories**: scam, illicit, info, satire, spam, legitimate, irrelevant, unsure, pass (`illicit` is still a valid vote, but is merged into `scam` when computing consensus — see [Vote Assessment Logic](#vote-assessment-logic))
- **Truth Score**: 0-5 scale for info-categorized messages
- **Response Rating**: great, acceptable, unacceptable (for AI responses)
- **Consensus**: Auto-calculated based on vote thresholds (varies by category)
- **Report indicator**: Polls created from user-filed reports display a "Report" pill in the voting UI
- **Assignment**: New messages are handed out to a fair share of active checkers — each with a daily cap — rather than broadcast to everyone, and under-voted messages are topped up through the day. See [Vote Distribution Engine](#vote-distribution-engine).

### Bot Commands

`/start`, `/onboard`, `/stop`, `/activate`, `/deactivate`, `/resources`

The `/start` command presents a "Let's go!" button that begins onboarding inline, without requiring `/onboard`.

### Onboarding Flow (5 steps)

Name → Phone → Quiz → WhatsApp → Group Chat

### Checker Lifecycle Management

Automated via `checkers-event-handler-service` (queue consumer + daily crons) and `checkers-reminder-alarm-service` (Durable Object alarms).

All day thresholds below are **configurable parameters** read from a Cloudflare KV store (with code defaults in `shared/helpers/parameters.ts`, seeded from `parameters/*.json`). The numbers shown are the **production defaults** — staging overrides them to fractions of a day for fast testing.

**Inactivity Flow:**

- Day 3 (`INACTIVITY_WARNING_DAYS`): Warning message ("you'll be deactivated in 7 days")
- Day 10 (`INACTIVITY_DEACTIVATION_DAYS`): Deactivation (`isActive=false`) + schedule reminder alarms
- Reminder #1 — `REMINDER_1_DAYS` (14) after deactivation, i.e. ~Day 24: "We miss you" + Reactivate button
- Reminder #2 — `REMINDER_2_DAYS` (28) after Reminder #1, i.e. ~Day 52: final reminder

**Programme Flow:**

- Day 60 (`PROGRAMME_EXTENSION_DAYS`): Extension notice (for active programmes not yet extended — `status="active"`, `hasReceivedExtension=false`)
- Day 90 (`PROGRAMME_OFFBOARDING_DAYS`): Offboarding (remove from group, `onboardingStatus="offboarded"`)

## Key API Routes

| Route                                        | Purpose                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST /polls/webhook`                        | Receive new checks from CheckMate; creates a poll and runs **initial vote distribution** (webhook svc) |
| `GET /api/polls/[id]`                        | Poll details                                                                                           |
| `GET /api/polls/[id]/results`                | Poll vote statistics                                                                                   |
| `GET/POST /api/votes/[voteId]`               | Fetch/submit votes                                                                                     |
| `GET /api/checkers/[id]/votes`               | Paginated votes for checker                                                                            |
| `POST /telegram` (webhook svc)               | Bot message handling                                                                                   |
| `POST /typeform` (webhook svc)               | Quiz completion callback                                                                               |
| `POST /checker-stats` (webhook svc)          | Batch stats for ops automation                                                                         |
| `POST /admin/check-graduation` (webhook svc) | Admin-triggered graduation check                                                                       |

## Database Models

- **Checker**: User profile, onboarding status, vote stats, lifecycle fields (`lastActivatedDate`, `lastInactivityWarningSent`, `offboardingTime`, `hasReceivedExtension`, `hasCompletedProgramme`), and **daily-assignment fields** (`maxDailyVotes` — how many messages this checker is willing to be assigned per day, default 10; `dailyAssignmentCount` — how many they've been assigned today, reset to 0 nightly)
- **Poll**: Message content (`text`/`imageUrl`/`caption`), AI responses (longform, shortform, human), `isReport` flag, crowd-sourced category/truth score
- **Vote**: Individual vote with category, truth score, response rating, A/B test flag (`showNoteAfterVote`), and `telegramMessageId` linking it to the notification sent to the checker
- **Programme**: Checker enrollment with targets (votes, accuracy, reports), status tracking

## Architecture Notes

### Database Service

Instead of direct MongoDB connections from NextJS, this project uses a dedicated database service (`workers/checkers-db-service/`) implemented as a Cloudflare Worker with Durable Objects for connection pooling. This architecture decision was made due to challenges with MongoDB direct connections in Cloudflare Workers environments.

### Webhook Service

`workers/checkers-webhook-service/` is a Cloudflare WorkerEntrypoint with RPC support. It handles:

- **Telegram webhook** (`POST /telegram`): Bot commands and callback queries via Grammy
- **Poll webhook** (`POST /polls/webhook`): Receives checks from CheckMate, creates polls, and runs **initial vote distribution** — handing the new message to active checkers who still have daily budget (see [Vote Distribution Engine](#vote-distribution-engine))
- **Typeform webhook** (`POST /typeform`): Quiz completion during onboarding
- **Checker stats** (`POST /checker-stats`): Batch stats endpoint for ops automation
- **RPC method** `getOnboardingStatus(whatsappId)`: Called by other services to check onboarding state

### Vote Distribution Engine

**In plain terms:** When a new message comes in to be fact-checked, we don't ping every checker at once. That would overload the most engaged volunteers and leave some messages with too few votes and others with too many. Instead, each message is handed out to a fair share of checkers, every checker has a daily limit on how many messages they're asked about, and throughout the day the system keeps topping up any message that hasn't yet collected enough votes. The goal is **even workload** for checkers and **enough votes per message** to reach a confident verdict.

The logic lives in `shared/helpers/distributor/` and is shared by two workers (the webhook service for the first pass, the event-handler service for the top-ups).

#### Daily budget

Each checker has a `maxDailyVotes` cap (default **10**) and a running `dailyAssignmentCount`. A checker is only handed a new message while they still have budget left. A cron resets every active checker's count to 0 at **midnight SGT**, so budgets refill each day.

> ⚠️ **Known inconsistency in the code:** redistribution correctly compares `dailyAssignmentCount` against each checker's `maxDailyVotes`, but the _initial_ distribution query (`findCheckersWithBudget`) gates on a `maxTarget` field that does not exist in the `Checker` schema. Because of the `$ifNull` fallback, the initial pass currently caps every checker at a flat **10** rather than honouring their personal `maxDailyVotes`. See [Known Issues](#known-issues--todos).

#### Two phases

- **Initial distribution** — runs the moment a poll arrives, inside the webhook service (`InitialPhaseDistributor`). The message is offered to every active, fully-onboarded checker who still has daily budget remaining.
- **Redistribution** — runs every 3 hours during the day (9 AM–9 PM SGT) via cron in the event-handler service (`RedistributionPhaseDistributor`). For each of today's polls that hasn't yet reached **`MIN_VOTES_NEEDED` (30)** completed votes, it requests only as many _additional_ checkers as the poll still needs, choosing checkers who:
  1. are active and fully onboarded,
  2. have **not already been assigned this poll** (deduplicated via a lookup against existing votes), and
  3. have the **most spare daily capacity** — the least-loaded checkers are picked first, which is what keeps the workload even.

#### Each assignment is transactional (state machine + rollback)

Assigning one message to one checker isn't a single database write — it touches several systems that **can't share one transaction** (MongoDB lives behind the DB worker; Telegram is an external API). So each assignment is run through a small state machine (`orchestration/runner.ts`) that performs the steps in order and remembers what it has done:

1. **Insert vote** — create the (unvoted) vote record in the DB.
2. **Send Telegram message** — notify the checker with the message to vote on.
3. **Link message to vote** — store the Telegram message id on the vote record.
4. **Reserve checker** — increment that checker's `dailyAssignmentCount`.

If **any** step fails, the runner **rolls back the completed steps in reverse order** — decrement the checker's count, unlink the message id from the vote, delete the Telegram message, then delete the vote record — so a half-finished assignment never leaves stray data or a phantom notification. Each checker's assignment runs **independently and in parallel**, and the results are tallied as `completed` / `rolledBack` / `failed`. One checker's failure never blocks the others, and the poll webhook returns these counts so callers can see how distribution went.

#### Where the pieces live

| Concern                   | Location                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Phase strategies          | `shared/helpers/distributor/initial.ts`, `post.ts`                                                                           |
| State machine + rollback  | `shared/helpers/distributor/orchestration/runner.ts`, `states/`                                                              |
| Checker selection queries | `checkers-db-service` RPC: `findCheckersWithBudget`, `findCheckersForRedistribution`, `getOpenPollsWithVotes`                |
| Triggers                  | Initial: poll webhook (`checkers-webhook-service`). Redistribution + nightly reset: crons (`checkers-event-handler-service`) |

### Vote Assessment Logic

**In plain terms:** this is how a pile of individual votes becomes a single verdict — and how the system decides it has heard from _enough_ checkers to call the result final. Easy cases (a message almost everyone flags as a scam) settle quickly; messy or ambiguous cases are held open until many more checkers have weighed in. A poll stays "unassessed" (no verdict yet) until one of those confidence bars is cleared.

Lives in `shared/helpers/voteAssessment.ts` — a single shared module used by **both** the Next.js API routes and the Cloudflare Workers, so the webapp and the background queue always compute verdicts the same way. The core entry point is `voteAssessment(dbService, pollId)`, which returns the verdict once consensus is reached, or `null` if it's still too early to call.

#### The three counts everything is measured against

Each poll's votes are bucketed into these populations:

- **Total vote requests** — every checker the poll was assigned to.
- **Fact-checkers** (`factCheckerCount`) — everyone assigned _except_ those who explicitly chose **pass**.
- **Valid responses** (`validResponseCount`) — checkers who actually cast a category vote (excludes both **pass** and not-yet-voted). **This is the denominator for all the majority checks below.**

> Note: `scam` and the former `illicit` category have been **merged** — the scam count covers both.

#### Picking the winning category

A category wins by simple majority — **more than 50% of valid responses** — with a few special cases:

- **Scam**: scam votes > 50% (and flagged "big sus" when scam > 75%, which finalises faster — see below).
- **Info (a factual claim)**: info votes > 50%. The claim's **truth score** (see below) then maps to a verdict: `< 1.5` → **untrue**, `1.5–3.75` → **misleading**, `> 3.75` → **accurate**.
- **Satire / Spam**: that category > 50%.
- **No-claim** (legitimate + irrelevant combined) > 50% resolves to **legitimate** if legitimate out-votes irrelevant, otherwise **irrelevant**.
- **Unsure**: chosen when no other category reaches a majority, or when "unsure" itself is > 50%.

A separate **harm signal** is also computed: scam (plus info votes when the truth score is very low) count as _harmful_; legitimate + spam (plus info votes when the truth score is very high) count as _harmless_. A harmful or harmless majority is one of the conditions that can finalise a poll.

#### Truth score (for factual claims)

The truth score is the **average of the 0–5 scores** submitted by checkers who voted "info" (`total of submitted scores ÷ number of info votes`); it's `null` when nobody voted info. It drives the untrue / misleading / accurate label above.

#### When is a poll "assessed" (enough votes)?

A poll is finalised as soon as **any** of these thresholds is cleared (`valid responses` must _exceed_ the value shown):

| Situation                           | Finalises once valid responses exceed |
| ----------------------------------- | ------------------------------------- |
| **Clear scam** (scam > 75%)         | `min(20% of fact-checkers, 4)`        |
| **Confident category** (not unsure) | `min(50% of fact-checkers, 10)`       |
| **Harmful majority**                | `min(50% of fact-checkers, 10)`       |
| **Harmless majority**               | `min(50% of fact-checkers, 10)`       |
| **Unsure / no clear majority**      | `min(80% of fact-checkers, 16)`       |

In practice: an obvious scam can be called with as few as ~5 votes, most clear results need ~10, and genuinely ambiguous messages are held open until ~16 checkers have responded. The `min(...)` caps mean small checker pools don't need a full percentage — a fixed vote count is enough.

#### AI response downvote

Independently of the category, the AI-drafted reply is marked **downvoted** when more than 50% of valid responses rated it "unacceptable" _and_ the poll has otherwise been assessed.

#### Output

When assessed, `voteAssessment` returns `{ primaryCategory, truthScore, isDownvoted }` — e.g. `{ primaryCategory: "scam", truthScore: null, isDownvoted: false }` or `{ primaryCategory: "misleading", truthScore: 2.4, isDownvoted: true }`. Until then it returns `null`, and the poll keeps collecting (and being redistributed) votes.

### Event Handler Service

`workers/checkers-event-handler-service/` handles:

- **Queue events**: Processes events such as `vote.submitted` for background vote assessment, plus programme-completion, certificate, and score-change events
- **Crons** (times in SGT; cron expressions are UTC in `wrangler.jsonc`):
  - 10:30 AM (`30 2 * * *`): Graduation sweep (`runGraduationSweep`)
  - 8:11 PM (`11 12 * * *`): Inactivity checks (3-day warning, 10-day deactivation)
  - 8:41 PM (`41 12 * * *`): Programme checks (60-day extension, 90-day offboarding)
  - Tuesdays 12:00 PM (`0 4 * * 2`): Weekly group welcome message for new checkers (`runWeeklyWelcomeMessage`)
  - Midnight (`0 16 * * *`): **Daily-budget reset** — sets every active checker's `dailyAssignmentCount` back to 0
  - 9 AM / 12 PM / 3 PM / 6 PM / 9 PM (`0 1,4,7,10,13 * * *`): **Redistribution** — tops up any of today's polls still short of the vote target (see [Vote Distribution Engine](#vote-distribution-engine))

### Alarm Service

`workers/checkers-reminder-alarm-service/` uses Durable Objects to schedule per-checker reminders after deactivation. Alarms are cancelled when checker reactivates via the "Reactivate Now" button.

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10 or higher)
- Git
- [MongoDB Compass](https://www.mongodb.com/try/download/compass) — GUI client for inspecting the dev database
- (Optional) Your own Telegram bot via BotFather if you want to test bot UX end-to-end. Not needed for backend/webhook work — you can hit endpoints directly with curl.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/checkmate-sg/checkers-service
cd checkers-service

# Install dependencies (pnpm monorepo - installs all workers too)
pnpm install
```

#### Environment files

The project uses several env files, none of which are checked in:

| File                                                | Purpose                            |
| --------------------------------------------------- | ---------------------------------- |
| `.env.development.local`                            | Next.js app config (incl. MongoDB) |
| `.dev.vars` (root)                                  | Local dev shared vars              |
| `workers/checkers-db-service/.dev.vars`             | DB worker secrets                  |
| `workers/checkers-webhook-service/.dev.vars`        | Telegram bot token, API key, etc.  |
| `workers/checkers-event-handler-service/.dev.vars`  | Queue + cron worker secrets        |
| `workers/checkers-reminder-alarm-service/.dev.vars` | Alarm worker secrets               |

These contain real secrets and a connection string to a shared dev MongoDB. **Request the bundle from the project lead** rather than provisioning your own — it ensures you connect to the same dev data as everyone else. Unzip into the repo root and the structure is preserved.

#### Connect MongoDB Compass

1. Open Compass.
2. Copy `MONGODB_CONNECTION_STRING` from `.env.development.local`.
3. Paste into the connection field and connect.
4. Key collections: `checkers`, `polls`, `votes`, `programmes`.

The dev DB is **shared** — be careful when modifying records, and prefer creating new test rows over editing existing ones.

### Running Locally

```bash
# Terminal 1: Start all Cloudflare Workers in parallel
pnpm dev:workers

# Terminal 2: Start the NextJS app
pnpm dev

# The app will be available at http://localhost:3002
```

#### Smoke test

Send a test poll to the webhook to confirm fan-out works end-to-end:

```bash
curl -X POST http://localhost:9083/polls/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY from workers/checkers-webhook-service/.dev.vars>" \
  -d '{
    "checkId": "test_'$(date +%s)'",
    "text": "Test message",
    "isReport": false
  }'
```

In Compass, a new row should appear in `polls`, plus one row per **assigned** checker in `votes` — i.e. active, onboarded checkers who still have daily budget (with `votedTimestamp: null` until the checker votes). Note this is a fair share of checkers, not necessarily everyone; see [Vote Distribution Engine](#vote-distribution-engine).

### Signing in locally

In local dev, Telegram `initData` verification is bypassed and the app **signs you in as a real checker from the dev DB**, matched by `LOCAL_DEV_TELEGRAM_ID` (set in `.env.development.local`).

A checker with that `telegramId` **must already exist** in the dev DB. If none is found, sign-in fails cleanly (you'll land on `/unauthorized` and see an actionable message in the worker logs) rather than logging you in as a phantom user. To get a checker:

- point `LOCAL_DEV_TELEGRAM_ID` at the `telegramId` of an existing checker in the (shared) dev DB, **or**
- onboard a new one through the Telegram bot (`/onboard`).

> There is no fallback "guest" user: a synthetic id is not a valid Mongo `ObjectId`, so it would `500` every checker API call once the DB service tries to convert it.

### Worker Ports

| Worker                          | HTTP Port | Description                         |
| ------------------------------- | --------- | ----------------------------------- |
| checkers-db-service             | 9080      | MongoDB database service            |
| checkers-reminder-alarm-service | 9081      | Durable Object alarms for reminders |
| checkers-event-handler-service  | 9082      | Queue consumer + daily cron jobs    |
| checkers-webhook-service        | 9083      | Telegram, poll & stats webhooks     |

### Testing the Poll Webhook

```bash
curl -X POST http://localhost:9083/polls/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "checkId": "check_123456",
    "text": "This is the main text content to be fact-checked",
    "isReport": false,
    "shortformResponse": {
      "en": "Brief summary in English",
      "cn": null,
      "links": ["https://source1.com"],
      "timestamp": "2024-01-15T10:30:00Z",
      "downvoted": false
    }
  }'
```

See [workers/checkers-webhook-service/README.md](workers/checkers-webhook-service/README.md) for full API documentation.

**Note:** `text` and `imageUrl` are mutually exclusive - you can provide both fields but one must be null.

## Deployment

```bash
pnpm deploy     # Deploy to Cloudflare
```

### Telegram Bot Setup

1. Create Telegram Bot via BotFather
2. Set bot menu button: `/mybots` -> Bot Settings -> Menu Button -> Edit Menu Button URL -> paste your deployed URL
3. Set up webhook:
   ```bash
   curl --location --globoff 'https://api.telegram.org/bot{{TELEGRAM_CHECKERS_BOT_TOKEN}}/setWebhook' \
     --form 'url="{{TELEGRAM_WEBHOOK_URL}}"' \
     --form 'secret_token="{{TELEGRAM_WEBHOOK_SECRET}}"'
   ```
4. Test by sending `/start` in the Telegram bot

## External Integrations

- **CheckMate Platform**: Sends polls via webhook, receives consensus results
- **Telegram**: Bot API + MiniApp SDK
- **Typeform**: Quiz during onboarding

## Testing

Run `pnpm test` to execute unit tests.

## Known Issues / TODOs

- Dashboard messages sent uses checkers num referred, may not be the actual number of WhatsApp messages sent
- Voting page shows all past and present votes without filtering completed ones. Needs pagination.
- Onboarding does not verify OTP or check if user has actually joined Telegram/WhatsApp
- Leaderboard score calculation does not follow current checkers webapp rules; does not show current placement of checker
- API calls use JWT token to pull user data; a higher-level improvement would be to do a simple fetch to retrieve session data similar to middleware

**Vote Distribution Engine** (see section above):

- `findCheckersWithBudget` (initial distribution) references a non-existent `maxTarget` field instead of `maxDailyVotes`, so the initial pass caps every checker at a flat 10 regardless of their configured limit.
- `StateRunner` is a single shared instance on `BasePollDistributor` whose `executed` array is mutated while all checkers' assignments run concurrently (`Promise.allSettled`). Under parallel load the rollback bookkeeping can replay or skip the wrong states. A `StateRunner` should be instantiated per assignment.
