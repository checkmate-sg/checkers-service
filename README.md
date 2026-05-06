# CheckMate Checkers Service

A Telegram miniapp for crowd-sourcing fact-checking of messages. Trained checkers vote on messages forwarded from the CheckMate platform to determine if they're scams, misinformation, spam, or legitimate.

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
shared/types/schema.ts          # DB schemas (Checker, Poll, Vote)
workers/
├── checkers-db-service/        # Cloudflare Worker for MongoDB
├── checkers-event-handler-service/  # Queue consumer + daily cron jobs for lifecycle
├── checkers-reminder-alarm-service/ # Durable Object alarms for reminders
└── checkers-webhook-service/   # Telegram, poll, Typeform & stats webhooks (WorkerEntrypoint with RPC)
```

## Core Features

### Authentication

- Telegram WebApp `initData` verified via HMAC-SHA256
- JWT sessions (30-day), secure cookies
- Protected routes: `/dashboard`, `/leaderboard`, `/votes`

### Voting System

- **Categories**: scam, illicit, info, satire, spam, legitimate, irrelevant, unsure, pass
- **Truth Score**: 0-5 scale for info-categorized messages
- **Response Rating**: great, acceptable, unacceptable (for AI responses)
- **Consensus**: Auto-calculated based on vote thresholds (varies by category)
- **Report indicator**: Polls created from user-filed reports display a "Report" pill in the voting UI

### Bot Commands

`/start`, `/onboard`, `/stop`, `/activate`, `/deactivate`, `/resources`

The `/start` command presents a "Let's go!" button that begins onboarding inline, without requiring `/onboard`.

### Onboarding Flow (5 steps)

Name → Phone → Quiz → WhatsApp → Group Chat

### Checker Lifecycle Management

Automated via `checkers-event-handler-service` (queue consumer + daily crons) and `checkers-reminder-alarm-service` (Durable Object alarms):

**Inactivity Flow:**

- Day 3: Warning message ("you'll be deactivated in 7 days")
- Day 10: Deactivation (`isActive=false`) + schedule reminder alarms
- Day 24: Reminder #1 ("We miss you" + Reactivate button)
- Day 52: Reminder #2 (final reminder)

**Programme Flow:**

- Day 60: Extension notice (if `hasCompletedProgramme=false`)
- Day 90: Offboarding (remove from group, `onboardingStatus="offboarded"`)

## Key API Routes

| Route                               | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `POST /polls/webhook`               | Receive new checks from CheckMate (on webhook service) |
| `GET /api/polls/[id]`               | Poll details                                           |
| `GET /api/polls/[id]/results`       | Poll vote statistics                                   |
| `GET/POST /api/votes/[voteId]`      | Fetch/submit votes                                     |
| `GET /api/checkers/[id]/votes`      | Paginated votes for checker                            |
| `POST /telegram` (webhook svc)      | Bot message handling                                   |
| `POST /typeform` (webhook svc)      | Quiz completion callback                               |
| `POST /checker-stats` (webhook svc) | Batch stats for ops automation                         |

## Database Models

- **Checker**: User profile, onboarding status, vote stats, lifecycle fields (`lastActivatedDate`, `lastInactivityWarningSent`, `offboardingTime`, `hasReceivedExtension`, `hasCompletedProgramme`)
- **Poll**: Message content (`text`/`imageUrl`/`caption`), AI responses (longform, shortform, human), `isReport` flag, crowd-sourced category/truth score
- **Vote**: Individual vote with category, truth score, response rating, A/B test flag (`showNoteAfterVote`)
- **Programme**: Checker enrollment with targets (votes, accuracy, reports), status tracking

## Architecture Notes

### Database Service

Instead of direct MongoDB connections from NextJS, this project uses a dedicated database service (`workers/checkers-db-service/`) implemented as a Cloudflare Worker with Durable Objects for connection pooling. This architecture decision was made due to challenges with MongoDB direct connections in Cloudflare Workers environments.

### Webhook Service

`workers/checkers-webhook-service/` is a Cloudflare WorkerEntrypoint with RPC support. It handles:

- **Telegram webhook** (`POST /telegram`): Bot commands and callback queries via Grammy
- **Poll webhook** (`POST /polls/webhook`): Receives checks from CheckMate, creates polls, fans out vote requests to all active checkers via Telegram
- **Typeform webhook** (`POST /typeform`): Quiz completion during onboarding
- **Checker stats** (`POST /checker-stats`): Batch stats endpoint for ops automation
- **RPC method** `getOnboardingStatus(whatsappId)`: Called by other services to check onboarding state

### Vote Assessment Logic

Located in `src/lib/helpers/voteAssessment/`. Determines consensus based on:

- \> 50% agreement for primary category
- Different vote thresholds for different category types (e.g., 4 votes for clear scams, 10+ for borderline cases)
- Truth scores mapped: <1.5 = untrue, 1.5-3.75 = misleading, >3.75 = accurate

### Event Handler Service

`workers/checkers-event-handler-service/` handles:

- **Queue events**: Processes `vote.submitted` events for background vote assessment
- **Daily crons**:
  - 8:11 PM SGT: Inactivity checks (3-day warning, 10-day deactivation)
  - 8:41 PM SGT: Programme checks (60-day extension, 90-day offboarding)

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

In Compass, a new row should appear in `polls`, plus one row per active checker in `votes` (with `votedTimestamp: null` until the checker votes).

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
