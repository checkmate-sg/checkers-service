This repo implements the CheckMate checkers service.

The checkers service is a telegram app comprising both the bot and the miniapp.

It receives messages via a webhook from the CheckMate platform.

It then provides an interface for checkers to vote on these messages.

# Tech Stack:

- NextJS
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- MongoDB (via Cloudflare Worker service)
- NextAuthV5
- Telegram miniapp/bot

# Architecture Notes:

## Database Service
Instead of direct MongoDB connections from NextJS, this project uses a dedicated database service (`workers/checkers-db-service/`) implemented as a Cloudflare Worker. This architecture decision was made due to challenges with MongoDB direct connections in Cloudflare Workers environments, as documented in [this article](https://alexbevi.com/blog/2025/04/11/performance-profiling-mongodb-on-cloudflare-workers/).

The deployment uses OpenNextJS/Cloudflare, and the database service acts as an intermediary layer to handle MongoDB operations efficiently within the Cloudflare Workers constraints.
