# CheckMate Checkers Service

A Telegram miniapp for crowd-sourcing fact-checking of messages. Trained checkers vote on messages forwarded from the CheckMate platform to determine if they're scams, misinformation, spam, or legitimate.

## Tech Stack

- **Frontend**: NextJS 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn-ui
- **Auth**: NextAuthV5 with Telegram credentials
- **Database**: MongoDB via Cloudflare Worker service
- **Telegram**: Bot (Telegraf/Grammy) + MiniApp (@twa-dev/sdk)
- **Deployment**: OpenNextJS/Cloudflare Workers

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── polls/webhook       # Receives checks from CheckMate
│   │   ├── votes/[voteId]      # Vote submission
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
└── checkers-reminder-alarm-service/ # Durable Object alarms for reminders
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

### Bot Commands
`/start`, `/onboard`, `/stop`, `/activate`, `/deactivate`, `/resources`

### Onboarding Flow (6 steps)
Name → Phone → Quiz → WhatsApp → Group Chat → NLB Partnership

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

| Route | Purpose |
|-------|---------|
| `POST /api/polls/webhook` | Receive new checks from CheckMate |
| `GET/POST /api/votes/[voteId]` | Fetch/submit votes |
| `GET /api/checkers/[id]/votes` | Paginated votes for checker |
| `POST /api/telegram/webhook` | Bot message handling |

## Database Models

- **Checker**: User profile, onboarding status, vote stats, lifecycle fields (`lastActivatedDate`, `lastInactivityWarningSent`, `offboardingTime`, `hasReceivedExtension`, `hasCompletedProgramme`)
- **Poll**: Message content, AI responses, crowd-sourced category
- **Vote**: Individual vote with category, truth score, response rating

## Architecture Notes

### Database Service
Instead of direct MongoDB connections from NextJS, this project uses a dedicated database service (`workers/checkers-db-service/`) implemented as a Cloudflare Worker with Durable Objects for connection pooling. This architecture decision was made due to challenges with MongoDB direct connections in Cloudflare Workers environments.

### Vote Assessment Logic
Located in `src/lib/helpers/voteAssessment/`. Determines consensus based on:
- >50% agreement for primary category
- Different vote thresholds for different category types (e.g., 4 votes for clear scams, 10+ for borderline cases)
- Truth scores mapped: <1.5 = untrue, 1.5-3.75 = misleading, >3.75 = accurate

### Event Handler Service
`workers/checkers-event-handler-service/` handles:
- **Queue events**: Processes `vote.submitted` events for background vote assessment
- **Daily crons**:
  - 8:11 PM SGT: Inactivity checks (3-day warning, 10-day deactivation)
  - 8:41 PM SGT: Programme checks (60-day extension, 90-day offboarding)

### Alarm Service
`workers/checker-reminder-alarm-service/` uses Durable Objects to schedule per-checker reminders after deactivation. Alarms are cancelled when checker reactivates via the "Reactivate Now" button.

## Development

```bash
npm run dev        # NextJS dev server (port 3002)
npm run dev:db     # Database worker (separate terminal)
npm run deploy     # Deploy to Cloudflare

# Workers (run in separate terminals)
cd workers/checkers-db-service && npm run dev
cd workers/checkers-event-handler-service && npm run dev  # use --test-scheduled for manual triggers
cd workers/checkers-reminder-alarm-service && npm run dev
```

## External Integrations

- **CheckMate Platform**: Sends polls via webhook, receives consensus results
- **Telegram**: Bot API + MiniApp SDK
- **Typeform**: Quiz during onboarding
- **NLB**: Educational partnership resources
