# Quickstart: Проверка быстрого создания и режимов полей

**Статус реализации:** локальный implementation complete; production и внешняя конфигурация не
затрагивались. Автоматические результаты фиксируются в `tasks.md`, ручной проход остаётся частью
приёмки владельцем перед любым release.

## Prerequisites

- Dependencies installed at repository root.
- Local frontend can use the existing configured development backend or the database-free mocked Playwright path.
- Do not use production credentials or production database for this validation.

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test e2e/task-capture-fields.spec.ts
```

## Manual desktop scenario

1. Sign in with a development account and open Tasks.
2. Open creation and verify title receives focus.
3. Select «Коротко», enter only a title and create the task.
4. Open creation again, fill medium fields, switch through all modes and verify values remain.
5. In Settings hide energy and priority, reopen create/edit and confirm both are absent but the task still saves.
6. Restore the fields and confirm the old values remain.
7. Simulate a failed save and confirm the draft remains available for retry.

## Manual mobile scenario

Repeat the primary flow at 320, 360, 390 and 430 px:

1. The form is bottom-aligned and has no horizontal overflow.
2. The title and primary actions remain usable with the software keyboard open.
3. The sheet does not sit behind bottom navigation.
4. Closing creates nothing; repeated submit creates no duplicate.

## Compatibility scenario

1. Open a legacy task containing energy, priority, date, category, time and subtasks.
2. Hide energy/priority and edit another visible field.
3. Restore the fields and confirm their original values.
4. Run existing task, offline, analytics and Telegram suites.
5. Confirm `src/pages/LandingPage.tsx`, backend, contracts, Prisma schema and migrations are unchanged.

## Rollback

Revert the presentation/settings commits for this feature. Existing task records and queued offline mutations require no data rollback because the public task payload and schema are unchanged.
