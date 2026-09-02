# Tasks: Быстрое создание и режимы полей задачи

**Input**: Design documents from `/specs/014-task-capture-fields/`

**Tests**: Автоматические проверки обязательны, потому что функция меняет общий create/edit flow, persisted preferences, offline-совместимость и mobile dialog.

## Phase 1: Setup

**Purpose**: Зафиксировать тестовые точки и не менять существующий task contract.

- [X] T001 Подготовить общие test helpers и сценарии формы задачи в `src/components/tasks/TaskFormModeControl.test.tsx` и `e2e/task-capture-fields.spec.ts`

---

## Phase 2: Foundational

**Purpose**: Создать единый типизированный слой режима и account-scoped предпочтений, от которого зависят create/edit/settings.

- [X] T002 Добавить типы режимов, безопасную нормализацию и account-scoped preferences API в `src/store/useSettingsStore.ts`
- [X] T003 [P] Покрыть defaults, повреждённые persisted значения и изоляцию аккаунтов в `src/store/useSettingsStore.test.ts`
- [X] T004 Создать общий переключатель «Коротко / Средне / Полно» и правила видимости секций в `src/components/tasks/TaskFormModeControl.tsx`
- [X] T005 [P] Проверить labels, keyboard selection и правила видимости в `src/components/tasks/TaskFormModeControl.test.tsx`

**Checkpoint**: Режимы и предпочтения доступны без изменения TaskDraft или backend API.

---

## Phase 3: User Story 1 — Быстро записать задачу (Priority: P1) 🎯 MVP

**Goal**: Создать задачу только по названию с текущими безопасными defaults и защитой от повторного submit.

**Independent Test**: Открыть create dialog, ввести только название, дважды нажать сохранение и получить ровно одну задачу; пустое название и отмена ничего не создают.

### Tests for User Story 1

- [X] T006 [P] [US1] Добавить component tests title-only, validation, cancel, failed retry и duplicate-submit в `src/components/tasks/CreateTaskModal.test.tsx`
- [X] T007 [P] [US1] Добавить Playwright smoke быстрого создания на desktop и mobile в `e2e/task-capture-fields.spec.ts`

### Implementation for User Story 1

- [X] T008 [US1] Сделать title-first создание, понятную inline-ошибку и сохранение draft при ошибке в `src/components/tasks/CreateTaskModal.tsx`
- [X] T009 [US1] Сохранить существующие TaskDraft defaults, offline mutation и возврат к активным задачам в `src/components/tasks/CreateTaskModal.tsx` и `src/pages/TaskPage.tsx`

**Checkpoint**: Быстрое создание самостоятельно работает на desktop/mobile и не меняет API payload.

---

## Phase 4: User Story 2 — Выбрать подробность формы (Priority: P1)

**Goal**: Дать три режима одной формы без потери введённых или существующих значений.

**Independent Test**: Заполнить все поля, переключиться между тремя режимами и сохранить те же значения; в полном режиме доступны подзадачи.

### Tests for User Story 2

- [X] T010 [P] [US2] Добавить component tests переключения режимов без потери create draft в `src/components/tasks/CreateTaskModal.test.tsx`
- [X] T011 [P] [US2] Добавить component tests сохранения edit values и full-mode subtasks в `src/components/tasks/EditTaskModal.test.tsx`

### Implementation for User Story 2

- [X] T012 [US2] Интегрировать общий режим и progressive disclosure в `src/components/tasks/CreateTaskModal.tsx`
- [X] T013 [US2] Интегрировать те же режимы без изменения mutation/subtask semantics в `src/components/tasks/EditTaskModal.tsx`

**Checkpoint**: Create и edit используют одинаковые labels и правила, но сохраняют текущую бизнес-логику.

---

## Phase 5: User Story 3 — Скрыть энергию и приоритет (Priority: P2)

**Goal**: Независимо скрывать energy/priority в формах, не удаляя их значения.

**Independent Test**: Скрыть оба поля в Settings, сохранить новую и старую задачу, вернуть поля и увидеть совместимые default/исходные значения.

### Tests for User Story 3

- [X] T014 [P] [US3] Добавить settings tests управления режимом и двумя visibility toggles в `src/pages/SettingsPage.task-form.test.tsx`
- [X] T015 [P] [US3] Добавить create/edit regression tests сохранения скрытых значений в `src/components/tasks/CreateTaskModal.test.tsx` и `src/components/tasks/EditTaskModal.test.tsx`

### Implementation for User Story 3

- [X] T016 [US3] Добавить спокойный блок «Форма задачи» с default mode и visibility toggles в `src/pages/SettingsPage.tsx`
- [X] T017 [US3] Применить account-scoped visibility preferences в `src/components/tasks/CreateTaskModal.tsx` и `src/components/tasks/EditTaskModal.tsx`

**Checkpoint**: Настройки одного аккаунта не показываются другому, а скрытие не меняет данные задач.

---

## Phase 6: User Story 4 — Одна понятная форма на разных экранах (Priority: P2)

**Goal**: Сделать один доступный dialog: centered на desktop и bottom sheet на mobile.

**Independent Test**: На 320/360/390/430 px и desktop открыть create/edit, проверить focus, Escape/backdrop, scroll, keyboard-safe actions и отсутствие horizontal overflow.

### Tests for User Story 4

- [X] T018 [P] [US4] Добавить dialog accessibility/responsive component tests в `src/components/ui/Modal.test.tsx`
- [X] T019 [P] [US4] Расширить Playwright проверками 320/360/390/430 px, close semantics и overflow в `e2e/task-capture-fields.spec.ts`

### Implementation for User Story 4

- [X] T020 [US4] Обновить существующий Headless UI dialog до responsive centered/bottom-sheet presentation в `src/components/ui/Modal.tsx`
- [X] T021 [US4] Добавить явную кнопку закрытия, focus target и доступные pending/error states в `src/components/tasks/CreateTaskModal.tsx` и `src/components/tasks/EditTaskModal.tsx`

**Checkpoint**: Один modal primitive удовлетворяет mobile и desktop contract без отдельной формы.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Проверить совместимость и подготовить безопасный локальный merge.

- [X] T022 [P] Обновить фактический статус блока и ручные сценарии в `specs/014-task-capture-fields/quickstart.md` и `docs/product-roadmap.md`
- [X] T023 Запустить focused Vitest для settings/create/edit/modal и исправить выявленные регрессии
- [X] T024 Запустить существующие task, offline, analytics и Telegram suites из `src/**/*.test.*` и `e2e/*.spec.ts` без production credentials
- [X] T025 Запустить полный frontend gate из `package.json`: `npm run typecheck`, `npm run lint`, `npm run test` и `npm run build`
- [X] T026 Запустить `npx playwright test e2e/task-capture-fields.spec.ts` или явно зафиксировать локальный environment blocker
- [X] T027 Проверить `git diff --check`, отсутствие изменений landing/backend/contracts/Prisma и выполнить manual quickstart из `specs/014-task-capture-fields/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: начинается сразу.
- **Foundational**: зависит от T001 и блокирует все истории.
- **US1**: зависит от T002–T005; является минимально ценным slice.
- **US2**: зависит от общего presentation layer и использует устойчивый submit из US1.
- **US3**: зависит от account-scoped settings и режимов; independently testable через Settings + create/edit.
- **US4**: зависит от готовой формы, но не меняет её data contract.
- **Polish**: после выбранных историй; полный gate после US1–US4.

### Parallel Opportunities

- T003 и T005 можно готовить параллельно после соответствующих API/component skeleton.
- T006 и T007, T010 и T011, T014 и T015, T018 и T019 затрагивают разные test layers.
- T022 можно выполнять параллельно финальным автоматическим проверкам.

## Parallel Examples

### User Story 1

```text
T006: component behavior in src/components/tasks/CreateTaskModal.test.tsx
T007: browser journey in e2e/task-capture-fields.spec.ts
```

### User Story 2

```text
T010: create draft preservation tests
T011: edit compatibility and subtasks tests
```

### User Story 3

```text
T014: settings interaction tests
T015: hidden-value regression tests
```

### User Story 4

```text
T018: dialog primitive tests
T019: viewport/e2e tests
```

## Implementation Strategy

### MVP First

1. Выполнить T001–T005.
2. Выполнить T006–T009.
3. Проверить title-only create отдельно до расширения режимами.

### Incremental Delivery

1. Foundation: типы, normalization, account isolation.
2. Быстрое создание: один короткий проверяемый commit.
3. Режимы create/edit: второй commit.
4. Settings visibility: третий commit.
5. Responsive dialog, docs и полный regression gate: финальный commit.

## Format Validation

Все задачи используют формат `- [ ] TNNN [P?] [US?] описание с точным путём`; story labels присутствуют только в story phases.
