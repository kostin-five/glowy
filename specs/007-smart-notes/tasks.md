# Tasks: Умные заметки

**Input**: Design documents from `specs/007-smart-notes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup

- [x] T001 Review the additive SQL and document that it must not be applied in `backend/prisma/migrations/20260826190000_add_smart_notes/migration.sql`
- [x] T002 Add note and link relations to the existing data model in `backend/prisma/schema.prisma`
- [x] T003 [P] Define shared frontend note and task-link shapes in `src/types/index.ts`

---

## Phase 2: Foundational

- [x] T004 Mount authenticated notes routes in `backend/app.js` and create the route skeleton in `backend/routes/notes.routes.js`
- [x] T005 [P] Create the authenticated notes API client with safe response parsing in `src/api/NoteApi.ts`
- [x] T006 Add database-free Prisma mocks and notes route test harness in `backend/test/notes-routes.test.js`

**Checkpoint**: Shared storage contract, route boundary and frontend client are ready.

---

## Phase 3: User Story 1 — Сохранить и продолжить мысль (P1)

**Goal**: Create, list, open and reliably update a note with clear states.

**Independent Test**: Create and edit a note, reload it and verify the last acknowledged content plus empty/error states.

- [x] T007 [US1] Add ownership-scoped list/create/read/update validation and handlers in `backend/routes/notes.routes.js`
- [x] T008 [US1] Cover empty content, long content, ownership and stale-save-safe responses in `backend/test/notes-routes.test.js`
- [x] T009 [P] [US1] Build note list, empty/error states and editor status components in `src/components/notes/NoteList.tsx` and `src/components/notes/NoteEditor.tsx`
- [x] T010 [US1] Compose loading, selection and revision-safe saving in `src/pages/NotesPage.tsx`
- [x] T011 [US1] Register lazy `/notes` routing and Russian navigation entries in `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileMoreSheet.tsx`, and `src/components/layout/BottomNav.tsx`
- [x] T012 [US1] Add focused editor/save-state tests in `src/pages/NotesPage.test.tsx`

---

## Phase 4: User Story 2 — Найти и архивировать заметку (P1)

**Goal**: Search title/body, distinguish no-results and move notes between active and archive.

**Independent Test**: Search with Cyrillic/case variants, archive a result and restore it from archive.

- [x] T013 [US2] Implement bounded owner-scoped search and archive filters in `backend/routes/notes.routes.js`
- [x] T014 [US2] Cover search, archive and restore contracts in `backend/test/notes-routes.test.js`
- [x] T015 [US2] Add debounced search, active/archive tabs and restore actions in `src/pages/NotesPage.tsx` and `src/components/notes/NoteList.tsx`

---

## Phase 5: User Story 3 — Связать заметку с задачей (P2)

**Goal**: Create/remove owned links and navigate in both directions.

**Independent Test**: Link an owned task, navigate both ways, remove the link and reject a foreign task.

- [x] T016 [US3] Add idempotent owned task-link create/delete handlers and reciprocal task includes in `backend/routes/notes.routes.js` and `backend/routes/task.routes.js`
- [x] T017 [US3] Cover duplicate, foreign-note and foreign-task link isolation in `backend/test/notes-routes.test.js`
- [x] T018 [P] [US3] Add linked-task picker and links to the note editor in `src/components/notes/NoteEditor.tsx`
- [x] T019 [US3] Render reciprocal note links and navigation in `src/components/tasks/TaskItem.tsx` and wire link refresh in `src/pages/NotesPage.tsx`

---

## Phase 6: User Story 4 — Получить черновик задачи из заметки (P2)

**Goal**: Generate an editable draft without mutation and create one linked task only after confirmation.

**Independent Test**: Cancel/error creates no task; edited confirmation creates exactly one task and link.

- [x] T020 [P] [US4] Implement safe note-fragment prompt parsing in `backend/services/ai/note-task-draft.service.js`
- [x] T021 [US4] Add ownership, AI-limit, draft-only and atomic confirmation endpoints in `backend/routes/notes.routes.js`
- [x] T022 [US4] Cover cancellation-by-contract, limit/provider errors and atomic confirmed creation in `backend/test/notes-routes.test.js` and `backend/services/ai/note-task-draft.service.test.js`
- [x] T023 [P] [US4] Build the editable Russian task draft dialog in `src/components/notes/NoteTaskDraftDialog.tsx`
- [x] T024 [US4] Wire selection, offline guard, generation, cancel and guarded confirmation in `src/components/notes/NoteEditor.tsx` and `src/pages/NotesPage.tsx`
- [x] T025 [US4] Add UI tests proving cancel/error do not call confirmation and double submit is blocked in `src/pages/NotesPage.test.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T026 [P] Add v2.7.0 behavior, migration approval boundary and offline limitation to `docs/product-roadmap.md` and `docs/handoffs/DEVELOPER_ONBOARDING.md`
- [x] T027 Run `git diff --check`, frontend typecheck/lint/tests/build and backend tests, then record results in `specs/007-smart-notes/quickstart.md`
- [x] T028 Perform Spec Kit convergence and resolve any remaining spec/plan/task gaps in `specs/007-smart-notes/tasks.md`
- [x] T029 Create focused specification, backend/data, frontend and documentation commits after all checks pass

## Dependencies & Execution Order

- Phase 1 → Phase 2 blocks all stories.
- US1 is the MVP and blocks US2–US4 UI composition.
- US2 depends on US1 list/editor but is otherwise isolated.
- US3 depends on US1 persistence and existing tasks.
- US4 depends on US1, link storage from US3, and existing AI limits/provider.
- Polish follows all selected stories.

## Parallel Opportunities

- T003 can run while T001–T002 are reviewed.
- T005 and T006 can run after the route contract is fixed.
- In US1, T009 can run alongside backend T007–T008.
- In US3, T018 can run alongside backend T016–T017.
- In US4, T020 and T023 can run in parallel before endpoint/UI integration.

## Implementation Strategy

1. Deliver US1 as a complete notes MVP with isolation and reliable saving.
2. Add search/archive as a small P1 increment.
3. Add reciprocal manual task links.
4. Add the draft-only AI path and atomic confirmation last.
5. Never apply the prepared migration during implementation or verification.
