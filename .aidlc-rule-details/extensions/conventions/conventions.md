# Code Conventions

> AI-DLC Extension: loaded during construction phase before code generation.
> These conventions are enforced by ESLint and reviewed in PRs.

---

## TypeScript

- Strict mode is on. No implicit `any`. No `as SomeType` without a comment explaining why.
- Use `type` for object shapes. Use `interface` only when deliberate extension is needed.
- Types derived from Zod schemas: use `z.infer<typeof Schema>` — never write a parallel manual type.
- Prefer `unknown` over `any`; narrow with type guards.

---

## Imports

Path aliases — never use deep relative paths:

```ts
import { Checker } from "@shared/types/schema"; // shared/
import { assessVotes } from "@/lib/helpers/..."; // src/
import { Button } from "@/components/ui/button";
// NOT: import { Checker } from "../../shared/types/schema"
```

---

## React Components

- Named exports for all components. Default exports only for Next.js pages and layouts.
- One component per file. Filename = component name (PascalCase).
- Props interface in same file, named `<ComponentName>Props`.
- Server components are default. Add `"use client"` only when needed.
- Client-side data fetching: React Query hooks in `src/hooks/use-<resource>.ts`. Never call `fetch()` directly inside a component.

---

## API Routes

Pattern for every route:

```ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // call src/lib/helpers/ — no business logic here

  return NextResponse.json(result);
}
```

Error responses always use `{ error: string }` shape. Never expose stack traces.
HTTP status codes: 400 bad input · 401 no auth · 403 wrong user · 404 not found · 500 unexpected.

---

## Styling

- Tailwind CSS only. No CSS modules, no styled-components, no new UI libraries.
- shadcn/ui for all UI primitives — import from `@/components/ui/`.
- Inline `style` objects only for truly dynamic computed values (e.g., JS-calculated widths).
- Mobile-first responsive design. Use `sm:` / `md:` / `lg:` breakpoints.

---

## Testing

- Test files: `tests/<mirror-of-src-path>.test.ts`
- Vitest. Import from `vitest`: `describe`, `it`, `expect`, `vi`.
- Mock all external services (DB client, Telegram API). No real network calls in tests.
- Minimum: one happy-path test + one error/edge-case test per exported function.
- For vote consensus logic: always test values at, above, and below each threshold boundary.

---

## High-Risk Areas — Extra Care Required

These areas have subtle logic. Read existing tests before modifying:

**`src/lib/helpers/voteAssessment/`** — consensus calculation.
Different vote thresholds per category (4 votes for clear scams, 10+ for borderline).
Truth scores map to: <1.5 untrue · 1.5–3.75 misleading · >3.75 accurate.
Any change here requires human review before merging.

**`src/lib/auth.config.ts`** — Telegram initData HMAC-SHA256 verification.
A bug here breaks authentication for all users. Do not modify without explicit approval.

**`workers/checkers-event-handler-service/` cron jobs** — run on live user data daily.
Bugs in lifecycle logic (inactivity warnings, deactivation, offboarding) affect real people.

---

## Commit Convention

Format: `<type>(<scope>): <description>`
Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`
Example: `feat(votes): add cursor-based pagination to checker votes API`

Branch from `staging`. PRs target `staging`.
Run `pnpm test` before every commit.
