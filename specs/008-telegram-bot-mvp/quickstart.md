# Quickstart: Validate Telegram Bot MVP

This guide validates code locally without changing production Telegram, Timeweb, Render, Vercel or
the production database.

## 1. Prerequisites

- Dependencies installed at repository root and `backend/`.
- A local/test PostgreSQL only if exercising the real queue manually.
- Public configuration names copied from `backend/.env.example`; do not paste values into chat,
  commits, terminal logs or screenshots.
- A separate test bot is required only for the final dev webhook check.

## 2. Static and automated checks

```bash
cd backend
npx prisma validate
npm test
cd ..
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: schema valid, backend tests remain DB-free, frontend checks and production build pass.

## 3. HTTP contract check

With injected test dependencies, verify:

1. Missing/wrong webhook secret returns `401` and queues nothing.
2. A valid update returns `200` after one queue insert and before worker/Telegram API calls.
3. Repeating the same `update_id` returns `200` without a second queue item.
4. Authenticated settings API generates one raw code response while DB receives only its HMAC.
5. Expired/used/foreign codes cannot connect a Telegram account.

## 4. Handler scenarios

Using the fake Telegram client and mocked shared DB/service dependencies:

1. Unlinked `/today`, `/energy`, `/add` and voice reveal no user data.
2. `/start <code>` links once; repeated/foreign binding fails safely.
3. `/today` returns only owned, incomplete tasks for the agreed date.
4. `/energy` reads and changes only the linked owner within 0..100.
5. `/add` creates a pending draft and no Task.
6. Cancel leaves zero Tasks; repeated save callback creates exactly one Task.
7. AI limit exhaustion prevents provider bypass and draft creation.
8. Voice calls no STT or AI and asks for text.
9. Logs contain neither test message text nor token/code values.

## 5. Frontend check

On `/settings` as an authenticated test user:

1. Telegram panel reports unavailable when backend config is absent.
2. Available/disconnected state generates a one-time code and deep-link with expiry.
3. Connected state shows the date but no Telegram numeric identifier.
4. Unlink asks for confirmation and refreshes status.
5. Guest mode cannot generate a code.

Verify desktop and mobile widths. `src/pages/LandingPage.tsx` must remain unchanged.

## 6. Dev bot check (separate approval/setup)

Only after code checks and user-owned BotFather/env setup:

1. Apply the migration to an approved dev/test DB.
2. Configure the dev webhook using the repository script that reads env without printing secrets.
3. Use a separate Telegram test account to run link, `/today`, `/energy`, text `/add`, cancel/save,
   repeated callback, voice fallback and `/unlink`.
4. Inspect webhook status without exposing its URL or secret-bearing configuration in screenshots.

Production migration/webhook/env are outside this quickstart and require explicit approval plus a
fresh confirmed Timeweb backup.

## 7. Verification result — 2026-08-27

- `npx prisma validate` — passed; the additive schema is valid.
- `npm test` in `backend/` — passed, 89/89 tests. The first sandboxed run could not open a
  temporary Supertest loopback port; the approved local rerun passed without code changes.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test -- --run` — passed, 24 files and 82 tests.
- `npm run build` — passed, including PWA generation.
- `git diff --check` — passed.
- `src/pages/LandingPage.tsx` — unchanged.
- No migration, webhook, BotFather, environment, deploy or production operation was performed.
