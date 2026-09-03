# Tasks: Глобальное быстрое создание задачи

**Input**: Design documents from `/specs/015-quick-task-launcher/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md

## Phase 1: Setup

**Purpose**: Зафиксировать границы текущих точек входа и тестовую основу.

- [X] T001 Проверить существующие create entry points и связанные tests в `src/pages/TaskPage.tsx`, `src/components/tasks/TaskControls.tsx`, `src/components/layout/` и `src/components/mind/MindHubChat.tsx`

---

## Phase 2: Foundational

**Purpose**: Создать единый безопасный lifecycle launcher, блокирующий дальнейшие истории.

- [X] T002 Добавить типизированный open-event helper в `src/components/tasks/taskCreateLauncher.ts`
- [X] T003 [P] Добавить unit tests идемпотентного open helper в `src/components/tasks/taskCreateLauncher.test.ts`
- [X] T004 Создать единственный владелец `CreateTaskModal` в `src/components/tasks/GlobalTaskCreateLauncher.tsx`
- [X] T005 [P] Добавить lifecycle tests launcher в `src/components/tasks/GlobalTaskCreateLauncher.test.tsx`
- [X] T006 Подключить один `GlobalTaskCreateLauncher` к защищённому layout в `src/layout/AppLayout.tsx`

**Checkpoint**: Любая точка входа может открыть один modal без route change и отдельного store.

---

## Phase 3: User Story 1 — Создать задачу из любого основного раздела (Priority: P1) 🎯 MVP

**Goal**: Направить существующие task entry points к общему launcher и сохранить исходный route.

**Independent Test**: На TaskPage открыть форму через FAB и empty state; на другом route открыть launcher, сохранить title-only задачу и остаться на исходном route.

### Tests for User Story 1

- [X] T007 [P] [US1] Добавить TaskPage integration tests единственного launcher action в `src/pages/TaskPage.test.tsx`
- [X] T008 [P] [US1] Добавить Playwright route-preservation и single-dialog flow в `e2e/quick-task-launcher.spec.ts`

### Implementation for User Story 1

- [X] T009 [US1] Перевести FAB и empty-state TaskPage на общий open helper и убрать локальный modal lifecycle в `src/pages/TaskPage.tsx`

**Checkpoint**: Экран задач и любой программный вызов используют один modal и существующую mutation semantics.

---

## Phase 4: User Story 2 — Понятные точки входа на mobile и desktop (Priority: P1)

**Goal**: Сделать launcher видимым в Sidebar, mobile Header и page-header Glowy AI.

**Independent Test**: На desktop expanded/collapsed Sidebar и на 320–430 px mobile открыть dialog одной видимой кнопкой; на `/ai` сделать то же без выхода из чата.

### Tests for User Story 2

- [X] T010 [P] [US2] Расширить Sidebar tests для expanded/collapsed action в `src/components/layout/Sidebar.test.tsx`
- [X] T011 [P] [US2] Добавить Header tests compact action и доступности в `src/components/layout/Header.test.tsx`
- [X] T012 [P] [US2] Расширить Glowy AI page-header tests в `src/components/mind/MindHubChat.test.tsx`
- [X] T013 [P] [US2] Расширить Playwright viewport matrix и overflow checks в `e2e/quick-task-launcher.spec.ts`

### Implementation for User Story 2

- [X] T014 [US2] Добавить desktop action «Новая задача» без изменения logo/navigation semantics в `src/components/layout/Sidebar.tsx`
- [X] T015 [US2] Добавить 44×44 mobile action в `src/components/layout/Header.tsx`
- [X] T016 [US2] Добавить action в page-вариант Glowy AI header в `src/components/mind/MindHubChat.tsx`

**Checkpoint**: Все защищённые surfaces имеют явную точку входа, брендовые элементы не меняются.

---

## Phase 5: User Story 3 — Сохранить контекст и устойчивость формы (Priority: P2)

**Goal**: Подтвердить reuse account preferences, focus, error/retry и отсутствие перехвата ввода.

**Independent Test**: Открыть launcher с compact preference, проверить focus/return focus, ошибку с сохранённым draft и обычный ввод в заметке/AI без самопроизвольного открытия.

### Tests for User Story 3

- [X] T017 [P] [US3] Добавить integration tests focus, repeat-open и preference reuse в `src/components/tasks/GlobalTaskCreateLauncher.test.tsx`
- [X] T018 [P] [US3] Добавить Playwright cancel/error/input-isolation regression в `e2e/quick-task-launcher.spec.ts`

### Implementation for User Story 3

- [X] T019 [US3] Исправить выявленные focus/repeat-open интеграционные края только в `src/components/tasks/GlobalTaskCreateLauncher.tsx` и `src/components/tasks/taskCreateLauncher.ts`

**Checkpoint**: Launcher не добавляет собственных task semantics и не вмешивается в текстовый ввод.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Подтвердить совместимость и подготовить локальный merge.

- [X] T020 [P] Обновить статус самостоятельного блока в `specs/015-quick-task-launcher/quickstart.md` и `docs/product-roadmap.md`
- [X] T021 Запустить focused Vitest для launcher/layout/task page и исправить регрессии
- [X] T022 Запустить task, layout, mobile, offline и Telegram regression suites из `src/**/*.test.*` и `e2e/*.spec.ts`
- [X] T023 Запустить `npm run typecheck`, `npm run lint`, `npm run test` и `npm run build`
- [X] T024 Запустить `npx playwright test e2e/quick-task-launcher.spec.ts` или зафиксировать локальный environment blocker
- [X] T025 Проверить `git diff --check`, отсутствие изменений landing/backend/Prisma/contracts и выполнить manual quickstart из `specs/015-quick-task-launcher/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 блокирует все user stories.
- US1 зависит от единственного launcher lifecycle.
- US2 зависит от open helper, но после T006 independently testable через каждую surface.
- US3 проверяет cross-surface behavior после US1–US2.
- Polish выполняется после всех историй.

## Parallel Opportunities

- T003 и T005 можно готовить параллельно после определения event contract.
- T007 и T008 затрагивают разные test layers.
- T010–T013 покрывают независимые surfaces/test layers.
- T017 и T018 разделены между component и browser testing.
- T020 можно выполнять параллельно финальным проверкам.

## Implementation Strategy

### MVP First

1. Выполнить T001–T006.
2. Выполнить T007–T009.
3. Проверить single-dialog и route-preservation до добавления новых кнопок.

### Incremental Delivery

1. Foundation: helper + один layout owner.
2. TaskPage reuse: убрать локальное дублирование.
3. Видимые entry points: Sidebar, Header, Glowy AI.
4. Focus/error/input regressions, docs и полный gate.

## Format Validation

Все 25 задач используют формат `- [ ] TNNN [P?] [US?] описание с точным путём`; story labels присутствуют только в story phases.
