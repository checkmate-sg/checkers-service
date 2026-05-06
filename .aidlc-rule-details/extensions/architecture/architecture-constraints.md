# Architecture Constraints

> AI-DLC Extension: loaded during design and construction phases.
> These are HARD constraints. They are not preferences or style guidelines.
> Violating them creates runtime bugs in the Cloudflare Workers environment.

---

## CONSTRAINT 1: No Direct MongoDB from Next.js

**Rule**: The Next.js app (`src/`) and any code it imports MUST NOT connect to MongoDB directly.

**Why**: Cloudflare Workers do not support persistent TCP connections. MongoDB's Node.js driver
holds a connection pool that breaks in this environment.

**How it works instead**:

```
Next.js API route
  → HTTP fetch to checkers-db-service (port 9080 locally)
  → Durable Object holds the MongoDB connection pool
  → MongoDB Atlas
```

**When designing a feature**: if it needs DB access from Next.js, plan to call
`checkers-db-service` via HTTP. If a new DB operation is needed, add it to the
db-service handler, not to the Next.js route.

---

## CONSTRAINT 2: No Cross-Worker Module Imports

**Rule**: Workers under `workers/` are independent deployable units. They MUST NOT import
code from each other's `src/` directories.

**Allowed cross-worker communication**:

- HTTP calls (fetch to the worker's local port or service URL)
- Cloudflare service bindings (configured in `wrangler.jsonc`)
- RPC via `WorkerEntrypoint` (e.g., `getOnboardingStatus` on the webhook service)

**Shared code** that multiple workers need goes in `shared/` — this is the only
cross-boundary import allowed.

---

## CONSTRAINT 3: Auth Is Always Server-Side

**Rule**: Never trust a user ID, checker ID, or any identity claim supplied by the client.
Always derive identity from the server-side JWT session.

```ts
// CORRECT — in any API route
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const checkerId = session.user.id; // from the verified JWT

// WRONG — never do this
const checkerId = req.headers.get("x-checker-id");
const checkerId = searchParams.get("checkerId");
```

---

## CONSTRAINT 4: Cloudflare Workers Runtime Limitations

**Rule**: Workers run on the V8 isolate runtime, not Node.js. The following are unavailable:

- `fs` (no filesystem)
- `child_process`
- Most Node.js built-in stream APIs
- Native Node.js crypto (use `crypto.subtle` / Web Crypto API instead)
- Long-lived TCP connections (use Durable Objects for stateful connections)

**Next.js on Cloudflare via OpenNext**: some Node.js APIs are polyfilled but not all.
When in doubt, use Web APIs (`fetch`, `crypto.subtle`, `URL`, `TextEncoder`).

---

## CONSTRAINT 5: Single Source of Truth for Types

**Rule**: All TypeScript types for database models (Checker, Poll, Vote, Programme) live
exclusively in `shared/types/schema.ts`.

Do NOT:

- Redefine a type locally in a component or route
- Create a "partial" version of a schema type without importing from shared
- Add new DB fields anywhere except `shared/types/schema.ts`

**When adding a new field**: add it to `shared/types/schema.ts` first, then reference it
everywhere. This is a human checkpoint — stop and confirm before changing schema types.

---

## CONSTRAINT 6: Business Logic Placement

| Layer                          | What goes here                                | What does NOT go here              |
| ------------------------------ | --------------------------------------------- | ---------------------------------- |
| `src/app/api/*/route.ts`       | Auth check, input validation, HTTP response   | Business logic, DB queries         |
| `src/lib/helpers/`             | Business logic, calculations, transformations | HTTP handling, response formatting |
| `workers/checkers-db-service/` | DB queries, connection management             | Business logic                     |
| `shared/types/`                | TypeScript types, Zod schemas                 | Runtime logic                      |

---

## System Map

```
Telegram / Internet
      │
      ├── Telegram Bot (Grammy) ──► checkers-webhook-service (9083)
      │                                    │ HTTP + Service Binding
      └── MiniApp User ──► Next.js App     │
                           (port 3002)     ▼
                                │    checkers-db-service (9080)
                                │    [Durable Objects + MongoDB]
                                │
                           Cloudflare Queue
                                │
                                ▼
                    checkers-event-handler-service (9082)
                    [Queue consumer + daily crons]
                                │
                    checkers-reminder-alarm-service (9081)
                    [Durable Object alarms per checker]
```
