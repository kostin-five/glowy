# Quickstart: Validate Telegram Mini App

This guide validates code without changing production Telegram, Timeweb, Vercel, Render or the
production database. Never print env values, init data, credentials or user text.

## 1. Prerequisites

- Root and `backend/` dependencies installed.
- Existing v2.8.0 Telegram migration present in an approved local/dev DB when doing a real test.
- Public names copied from `.env.example`; secrets entered only in local/dev secret storage.
- HTTPS dev frontend URL configured as `TELEGRAM_MINI_APP_URL`, ending at `/telegram`.
- Real Telegram test requires user-owned BotFather configuration only after automated checks.

## 2. Static and automated checks

```bash
cd backend
npx prisma validate
npm test
cd ..
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

Expected: schema validates, database-free backend tests pass, frontend tests/build pass, PWA is
generated and `src/pages/LandingPage.tsx` is unchanged.

## 3. Mini App auth contract

With generated fixture init data and injected dependencies, verify:

1. Missing/wrong hash, changed user, stale/future `auth_date` and missing bot token return `401/503`
   without a cookie or leaked details.
2. Valid unlinked launch returns `TELEGRAM_REGISTRATION_REQUIRED`.
3. Register creates exactly one ordinary User and one connection; duplicate email leaves no orphan.
4. Login links the existing User; Telegram/User conflicts never replace another connection.
5. Repeat bootstrap issues a short Telegram-bound HttpOnly cookie and returns safe user fields.
6. Unlink makes that cookie fail the next protected request while User/tasks remain.
7. Raw init data, password, JWT, email and Telegram id are absent from captured logs.

## 4. Frontend bootstrap and full application

Use a mocked Telegram bridge at 320/360/390/430 px:

1. `/telegram` calls ready/expand, shows loader and maps only known targets.
2. New user can switch between registration/login without leaving Mini App.
3. Valid linked launch hydrates the existing auth store and opens each existing section: home,
   tasks, notes, AI, progress, analytics, settings.
4. Missing bridge, invalid launch, server failure and offline first launch show Russian retry/help,
   never a white screen.
5. Theme, viewport, keyboard, safe areas and native back do not hide controls or cause horizontal
   scrolling.
6. Payment/recovery/security transition calls the external-link adapter only after a click; normal
   web continues using its existing behavior.
7. First-time Mini App auth uses the same login/register screens as web while sending credentials
   through the Telegram channel adapter.
8. Logout, close and reopen stays on login without unlinking bot commands; a successful manual login
   clears the suppression and the following reopen restores automatically.

## 5. Bot controller

Using fake Telegram API and mocked shared services:

1. `/start`, `/help`, `/app` and unknown commands include «Открыть Glowy».
2. Navigation buttons map only to home/tasks/notes/AI/progress/analytics/settings.
3. Unlinked personal commands reveal no data and direct to Mini App registration.
4. `/today`, `/tasks`, `/energy`, `/progress` return only owned bounded data.
5. `/add` still creates no Task until save; repeated save creates one.
6. `/done` changes nothing on pick, completes only after confirm and never repeats XP.
7. Energy selection sets one bounded value; repeated callback is harmless.
8. `/ai` respects the same plan limit/provider and persists no chat/task/note.
9. Expired pending flow, voice and failures have Russian cancel/fallback paths.

## 6. Local browser check

Run frontend/backend normally. Opening `/telegram` in an ordinary browser must show a controlled
«Откройте Glowy из Telegram» state. Use test-only bridge fixtures for successful auth; never paste
real init data into source, test snapshots or terminal history.

## 7. Dev Telegram check (requires explicit configuration)

After green automated checks:

1. Deploy feature to dev and configure BotFather Main Mini App/menu URL to the approved dev
   `/telegram` URL.
2. Register a new Glowy user entirely inside Telegram; close/reopen and verify automatic entry.
3. Login an existing Glowy user and verify no duplicate account.
4. Exercise every section, command, confirm/cancel/repeat callback and unlink/reopen.
5. Verify `api/health`, webhook status and Render logs using controlled event codes only.
6. Test Telegram iOS/Android/Desktop when available plus ordinary dev web/PWA regression.

## 8. Production boundary

Production migration/env/webhook/BotFather URL/deploy are not part of local validation. Cutover of
the single bot requires explicit approval, confirmed current backup when data/schema work is
involved, disabled dev worker, rotation of `TELEGRAM_WEBHOOK_SECRET` and
`TELEGRAM_LINK_CODE_SECRET`, production URL/webhook switch and smoke verification.

## 9. Verification record — 2026-08-27

- `npx prisma validate`: passed; no database command or migration was executed.
- Backend: 126/126 tests passed, including five-minute init data, 24-hour cap, warmed restore under
  three seconds, conflicts, unlink revocation, webhook replay, command ownership and voice fallback.
- Frontend: typecheck and lint passed; 103/103 Vitest tests passed; production build passed.
- Telegram browser matrix: 33/33 Chromium checks passed — seven targets at 320/360/390/430 px,
  registration at all four widths and controlled access outside Telegram.
- Full existing Playwright regression: 80 passed, 1 intentionally skipped; one pre-existing mobile
  hint click timed out while its element was recreated and passed immediately in an isolated retry.
- `git diff --check`: passed. `src/pages/LandingPage.tsx` has no diff.

Release gates not run locally: real BotFather menu/webhook, Render/Vercel dev deploy, new-user and
existing-user flows in Telegram iOS/Android/Desktop, real unlink/reopen and external payment
transition. Production migration, env, webhook, services and data were not touched.

## 10. Production auth stabilization verification — 2026-08-30

- Focused Mini App credential/logout suite: 17/17 tests passed.
- Frontend typecheck and lint passed; full Vitest suite passed (141/141).
- Production build and `git diff --check` passed; PWA service worker was generated.
- Separate Telegram credential form was removed; ordinary web auth remains on its original API.
- No schema, migration, backend environment, webhook or production service was changed.

Release gate: after deployment, verify on a real Telegram client that logout → close → reopen stays
on the familiar login screen, then manual login → close → reopen restores the account normally.
