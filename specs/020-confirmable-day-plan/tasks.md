# Tasks: Подтверждаемый план дня

## Phase 1: Setup

- [X] T001 Зафиксировать ranking, review, apply и privacy contract в `specs/020-confirmable-day-plan/contracts/day-plan-ui-contract.md`
- [X] T002 Зафиксировать desktop/mobile/offline проверки и rollback в `specs/020-confirmable-day-plan/quickstart.md`

## Phase 2: Foundational

- [X] T003 [P] Добавить ranking/capacity/rationale unit-сценарии в `src/dashboard/dayPlan.test.ts`
- [X] T004 [P] Добавить review/cancel/confirm/partial failure component-сценарии в `src/components/dashboard/DayPlanReviewDialog.test.tsx`
- [X] T005 [P] Добавить allowlist/privacy проверки продуктовых событий в `src/utils/analytics.test.ts`
- [X] T006 [P] Добавить desktop/mobile пользовательский сценарий в `e2e/dashboard-day-plan.spec.ts`

## Phase 3: User Story 1 — Реалистичный следующий шаг (P1)

**Goal**: показать 1–3 объяснимых шага по сроку, энергии, приоритету и длительности.

**Independent Test**: дать одинаковому набору задач энергию 20/50/90 и проверить порядок, ёмкость и reason.

- [X] T007 [US1] Реализовать чистую модель рекомендаций в `src/dashboard/dayPlan.ts`
- [X] T008 [US1] Перевести Focus section на модель и показать reason/queue в `src/pages/DashboardPage.tsx`
- [X] T009 [US1] Обновить regression UI/order/read-only проверки в `src/pages/DashboardPage.test.tsx`

## Phase 4: User Story 2 — Обзор без скрытых изменений (P1)

**Goal**: пользователь проверяет и меняет выбор до любого update.

**Independent Test**: открыть dialog, toggle и cancel; store update не вызван, даты прежние.

- [X] T010 [US2] Реализовать доступный responsive обзор плана в `src/components/dashboard/DayPlanReviewDialog.tsx`
- [X] T011 [US2] Подключить открытие и временный draft к Focus section в `src/pages/DashboardPage.tsx`
- [X] T012 [US2] Добавить безопасное событие открытия в `src/utils/analytics.ts` и `src/pages/DashboardPage.tsx`

## Phase 5: User Story 3 — Явное применение (P2)

**Goal**: только выбранные задачи не на сегодня меняются через существующий store с честным результатом.

**Independent Test**: confirm смешанного набора вызывает точные updates; partial failure оставляет retry.

- [X] T013 [US3] Реализовать full/partial apply flow через callback dialog в `src/components/dashboard/DayPlanReviewDialog.tsx`
- [X] T014 [US3] Подключить `useUpdateTask`, success feedback и безопасную метрику в `src/pages/DashboardPage.tsx`
- [X] T015 [US3] Покрыть точные мутации и отсутствие повторных updates в `src/components/dashboard/DayPlanReviewDialog.test.tsx`

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 Выполнить typecheck, lint, unit tests, build, focused и полный Playwright по `specs/020-confirmable-day-plan/quickstart.md`
- [X] T017 Зафиксировать завершённый slice, проверки, ограничения и rollback в `docs/product-roadmap.md`

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish.
- T003–T006 независимы по файлам и задают тестовый контракт до реализации.
- US2 зависит от кандидатов US1; US3 зависит от review state US2.

## Parallel Opportunities

- T003, T004, T005 и T006 затрагивают разные test files.
- После pure-модели T009 и T010 независимы до интеграции в Dashboard.

## Implementation Strategy

MVP: US1 + US2 даёт полезную рекомендацию и проверяемый черновик без мутации. US3 добавляет только
явное применение через существующий store. Весь slice остаётся одним обратимым commit без schema,
backend, AI, env, production или push операций.
