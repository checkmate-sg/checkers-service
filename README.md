# CheckMate Checkers Service

A Telegram miniapp for crowd-sourcing fact-checking of messages.

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10 or higher)
- MongoDB Atlas account
- Telegram Bot Token
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/checkmate-sg/checkers-service
cd checkers-service

# Install dependencies (pnpm monorepo - installs all workers too)
pnpm install

# Copy environment variables template
cp .env.example .env.development.local

# Configure your .env.development.local with:
# - MongoDB connection string
# - Telegram bot token
# - NextAuth configuration

# Copy worker environment variables
cp workers/checkers-db-service/.dev.vars.example workers/checkers-db-service/.dev.vars
cp workers/checkers-webhook-service/.dev.vars.example workers/checkers-webhook-service/.dev.vars
# ... repeat for other workers as needed
```

### Running Locally

```bash
# Terminal 1: Start all Cloudflare Workers in parallel
pnpm dev:workers

# Terminal 2: Start the NextJS app
pnpm dev

# The app will be available at http://localhost:3002
```

### Worker Ports

| Worker | HTTP Port | Description |
|--------|-----------|-------------|
| checkers-db-service | 8788 | MongoDB database service |
| checkers-reminder-alarm-service | 8789 | Durable Object alarms for reminders |
| checkers-batch-service | 8790 | Daily cron jobs for lifecycle |
| checkers-webhook-service | 8791 | Telegram & poll webhooks |

## Checker Lifecycle Management

The system automatically manages checker engagement through scheduled batch jobs:

**Inactivity Management** (runs daily at 8:11 PM SGT):
- 3-day warning: Reminder that deactivation will occur in 7 more days
- 10-day deactivation: Sets `isActive=false`, schedules reminder alarms
- 14 days after deactivation: Reminder #1 with "Reactivate Now" button
- 28 days after Reminder #1: Reminder #2 (final)

**Programme Management** (runs daily at 8:41 PM SGT):
- 60-day extension: Notice for checkers who haven't completed the programme
- 90-day offboarding: Removes from group, marks as offboarded (only if extension was received)

## Deployment Setup

Follow these steps:

1. Execute quickstart above
2. Get tunnel and mongoDB connection string from BW
   - BW will map a https url to http://localhost:3002
   - mongoDB connection string from BW
3. Create Telegram Bot via BotFather - create a new bot - Set bot menu button (/mybots -> click the created bot -> Bot Settings -> Menu Button -> Edit menu Button URL -> paste https url from step 2) - Save the bot token (in bot father type /mybots -> click the bot you created -> API token)
   4 Set up telegram webhook - create your own webhook secret string by using the following command: openssl rand -base64 32 - go to postman and set webhook like so:
   `bash
 curl --location --globoff 'https://api.telegram.org/bot{{TELEGRAM_CHECKERS_BOT_TOKEN}}/setWebhook' \
 --form 'url="{{TELEGRAM_WEBHOOK_URL}}"' \
 --form 'secret_token="{{TELEGRAM_WEBHOOK_SECRET}}"'
 `
4. Start by doing /start in the telegram bot

## What technologies are used for this project?

This project is built with:

- NextJS
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- MongoDB
- NextAuthV5
- Telegram miniapp/bot

## Testing the Poll Webhook

The poll webhook is handled by `checkers-webhook-service`. See [workers/checkers-webhook-service/README.md](workers/checkers-webhook-service/README.md) for full API documentation.

### Quick Test

```bash
# Local development
curl -X POST http://localhost:8791/polls/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "checkId": "check_123456",
    "text": "This is the main text content to be fact-checked",
    "shortformResponse": {
      "en": "Brief summary in English",
      "cn": null,
      "links": ["https://source1.com"],
      "timestamp": "2024-01-15T10:30:00Z",
      "downvoted": false
    }
  }'
```

Expected response:

```json
{
  "message": "Poll created successfully",
  "id": "66abcdef123..."
}
```

**Note:** `text` and `imageUrl` are mutually exclusive - you can provide both fields but one must be null.

## Moving Forward

- Dashboard messages sent is using checkers num referred, may not be the actual number of whatsapp messages sent (check with big boss BW to know which variable to look at)
- Voting logic. As of now, there is no conclusive time or way that voting ends. The seed file checks evry 24hrs and concludes voting based on majority vote but seed only works when you manually deploy it on VS terminal. Hence there is no conclusive voting period. Any new postings will not conclude.
- Voting page also shows all pass and present votes, it does not remove votes that have been concluded or completed. Pagination.
- ~~Telegram bot does not alert user that there is new query~~ (Addressed: Polls webhook now sends notifications)
- Onboarding whatsapp bot link is not an actual link.
- Onboarding does not check if user has completed quiz, does not verify otp, if user has joined telegram or whatsapp. In the code file, everything the current bot does for onboarding that this new bot cannot do, is being commented out.
- ~~Most of the variables stored for a checker is not being used in current logic~~ (Addressed: Lifecycle fields now used for inactivity/programme management)
- Leaderboard score calculation does not follow current checkers webapp rules. It also does not show current placement of checker.
- Integration with AI responses, whatsapp messages. Api to receive this messages is exposed via the postman link
- Another improvement would be to relook at the API calls. Currently the API calls use JWT token to pull relevent user data. A higher level, improvement would be to do a simple fetch to retrieve session data, similar to what the middleware is doing. The current direct JWT approach can fail in Telegram Webapp hence the 4 ways of retrieving the token was used.
