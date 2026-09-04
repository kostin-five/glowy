# Tasks: Инструменты планирования задач

## Phase 1: Contracts and tests

- [ ] T001 Зафиксировать shared request/response contract AI-шагов и contract tests
- [ ] T002 [P] Добавить pure tests для комбинированных фильтров
- [ ] T003 [P] Добавить database-free backend route tests: auth, validation, limit, release, success
- [ ] T004 [P] Добавить component tests для draft/cancel/confirm/partial result

## Phase 2: Filters

- [ ] T005 Реализовать pure filter model в `src/utils/taskAdvancedFilters.ts`
- [ ] T006 Реализовать responsive control и active count в `src/components/tasks/TaskAdvancedFilters.tsx`
- [ ] T007 Подключить фильтры к `TaskPage`/`TaskList` без изменения store persistence

## Phase 3: AI subtask draft

- [ ] T008 Реализовать строгую нормализацию и prompt в `backend/services/ai/subtask-draft.service.ts`
- [ ] T009 Добавить authenticated limited endpoint в существующий AI router
- [ ] T010 Расширить `AiApi` общим валидированным методом
- [ ] T011 Реализовать общий локальный редактор черновика
- [ ] T012 Подключить create-flow без persistence до общего submit
- [ ] T013 Подключить edit-flow с уникальностью и честным partial retry

## Phase 4: Verification and documentation

- [ ] T014 Добавить desktop/mobile Playwright сценарии
- [ ] T015 Выполнить contracts/backend/frontend/typecheck/lint/unit/build/e2e gates
- [ ] T016 Обновить roadmap, architecture, onboarding и handoff 2026-09-04

## Dependencies

T001–T004 → T005–T013 → T014–T016. Фильтры и backend service независимы до UI integration.
