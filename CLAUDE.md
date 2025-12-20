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
│   │   └── telegram/webhook    # Bot commands
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
workers/checkers-db-service/    # Cloudflare Worker for MongoDB
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

## Key API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/polls/webhook` | Receive new checks from CheckMate |
| `GET/POST /api/votes/[voteId]` | Fetch/submit votes |
| `GET /api/checkers/[id]/votes` | Paginated votes for checker |
| `POST /api/telegram/webhook` | Bot message handling |

## Database Models

- **Checker**: User profile, onboarding status, vote stats
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

## Development

```bash
npm run dev        # NextJS dev server (port 3002)
npm run dev:db     # Database worker (separate terminal)
npm run deploy     # Deploy to Cloudflare
```

## External Integrations

- **CheckMate Platform**: Sends polls via webhook, receives consensus results
- **Telegram**: Bot API + MiniApp SDK
- **Typeform**: Quiz during onboarding
- **NLB**: Educational partnership resources
