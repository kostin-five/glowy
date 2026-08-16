# Quickstart: Validate v2.3.0-v2.5.0

## Prerequisites

- Dependencies installed in repository root and `backend/`.
- Local/test PostgreSQL URL only. Never point validation commands at Timeweb production.
- Additive migration preparation explicitly approved by the owner on 2026-08-16.
- Applying the migration remains an operator-only action after a fresh Timeweb backup.
- DeepSeek/GigaChat credentials are optional for automated tests; real AI smoke checks use dev environment only.

## Static and automated checks

From repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

From `backend/`:

```bash
npm run test
npx prisma validate
```

## Migration safety check

1. Confirm `DATABASE_URL` is not the Timeweb production host.
2. Review `20260816110000_add_personal_progress_analytics/migration.sql`: it must only add nullable/defaulted columns, backfill `completed_on`, and create the new feature tables/indexes.
3. Apply only to a disposable local/test database.
4. Verify old users, tasks, subtasks, payments and plan fields remain unchanged.
5. Production deploy remains a separate owner operation after a fresh Timeweb backup.

## v2.3.0 manual scenario

1. Sign in and open Settings on desktop and mobile.
2. Select each prepared avatar and reload; verify consistent display and unknown-id fallback.
3. Select Calm, Moderate and Strict, send neutral and missed-task messages, and verify respectful tone differences.
4. Clear local settings, open task creation, close the one-time popover and revisit; verify it stays hidden and Energy/Mind Hub have no duplicate onboarding panels.
5. Verify no Landing Page or auth behavior changed.

## v2.4.0 manual scenario

1. Open My Progress and switch between XP, Winning streak and Habits.
2. Create a habit, check/uncheck today, archive/restore it and verify duplicate checks are impossible.
3. Complete tasks on controlled dates, verify streak and last active date.
4. Attempt a rescue without confirmation, then confirm one eligible date; verify exactly one circle is consumed and a fourth monthly use is rejected.
5. Create tasks with and without estimates. Complete both, save actual time for one and skip the other.
6. Reload and repeat from a second browser; progress must match.

## v2.5.0 manual scenario

1. Seed a known set of completed tasks with low/medium/high energy and time data.
2. Compare week and month counts with the source tasks, including boundary dates.
3. Choose an empty period and verify no empty chart or fabricated conclusion appears.
4. As Start, call the AI insight UI and endpoint; access must be denied without usage consumption.
5. As Focus/Founder, request a weekly insight and verify five usage units are consumed only after success.
6. Request a monthly insight and verify ten usage units are consumed; confirm the response references only aggregate patterns and does not change tasks.
7. Inspect daily AI usage rows: request/provider/model/plan/token/cost fields may exist, but no prompt or response text may exist anywhere in the table or logs.

## Handoff checks

- Confirm release checkpoints can be committed separately as v2.3.0, v2.4.0 and v2.5.0.
- Record provider token prices in `.env.example` and docs without real values.
- List any checks skipped because a dev provider, database or premium account was unavailable.
- Do not begin v2.6.0 email/OAuth work in this branch.
