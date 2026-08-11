# Tasks: Разгрузка мыслей

**Input**: Design documents from `/specs/002-thought-unloading/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the specification for AI contract, no-mutation behavior, confirmation and
draft editing.

**Organization**: Tasks are grouped by user story and ordered so each checkpoint is testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files without incomplete dependencies
- **[Story]**: Maps to a user story from spec.md
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm existing test boundaries and lock the feature contract before code changes.

- [ ] T001 Record the no-persistence AI response contract in `specs/002-thought-unloading/contracts/mind-hub-api.md`
- [ ] T002 Verify existing Vitest and Node test patterns in `vite.config.ts`, `src/components/ui/AppErrorBoundary.test.tsx`, and `backend/test/app.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce shared draft types and parser behavior required by every story.

**⚠️ CRITICAL**: User-story work starts only after the response shape and parser are stable.

- [ ] T003 Add frontend `MindHubDraft` and `MindHubResponse.drafts` types without saved task ids in `src/api/AiApi.ts`
- [ ] T004 [P] Add parser tests for preserving reply with drafts, normalizing task fields, and rejecting malformed elements in `backend/services/ai/mind-hub-parser.service.test.js`
- [ ] T005 Update the AI prompt and payload normalization to always return a reply plus optional drafts and forbid automatic mutations in `backend/services/ai/mind-hub-parser.service.js`

**Checkpoint**: The draft contract exists and parser tests pass without database access.

---

## Phase 3: User Story 1 - Получить ответ без создания задачи (Priority: P1) 🎯 MVP

**Goal**: A normal question returns a useful answer and never changes tasks.

**Independent Test**: Send an ordinary question, receive a reply, and verify task/subtask counts
remain unchanged.

### Tests for User Story 1

- [ ] T006 [P] [US1] Add backend regression tests proving response construction is read-only and returns `drafts: []` for reply-only payloads in `backend/services/ai/mind-hub-parser.service.test.js`
- [ ] T007 [P] [US1] Update API client tests for reply-only and guest responses using `drafts` in `src/api/AiApi.analytics.test.ts`

### Implementation for User Story 1

- [ ] T008 [US1] Remove task creation and existing-task date mutation from both Mind Hub routes and return read-only drafts in `backend/routes/ai.routes.js`
- [ ] T009 [US1] Remove unused Mind Hub persistence helpers while retaining context, duplicate checks and limits in `backend/services/ai/mind-hub.service.js`
- [ ] T010 [US1] Update `AiApi.parseMindHub` to normalize guest and authenticated drafts without creating fake Task objects in `src/api/AiApi.ts`
- [ ] T011 [US1] Render AI replies without mutating the task store when drafts are returned in `src/components/mind/MindHubChat.tsx`
- [ ] T012 [P] [US1] Rename current product copy from «Хаб мыслей» to «Разгрузка мыслей» in `src/components/mind/MindHubChat.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/PricingPage.tsx`, and `src/pages/PrivacyPolicyPage.tsx`

**Checkpoint**: Ordinary questions and rejected AI output cannot create or update tasks.

---

## Phase 4: User Story 2 - Подтвердить черновик задачи (Priority: P2)

**Goal**: A user can edit, reject, or explicitly save exactly one suggested task.

**Independent Test**: Edit one draft title, confirm it, and verify exactly one saved task; reject a
second draft and verify no save.

### Tests for User Story 2

- [ ] T013 [P] [US2] Add component tests for edit, reject, confirm, disabled double-click and failed-save retry in `src/components/mind/MindHubDraftCard.test.tsx`
- [ ] T014 [P] [US2] Add consent-aware `ai_draft_confirmed` whitelist tests with no text payload in `src/utils/analytics.test.ts`

### Implementation for User Story 2

- [ ] T015 [US2] Build an accessible responsive draft editor with title, metadata, reject and confirm states in `src/components/mind/MindHubDraftCard.tsx`
- [ ] T016 [US2] Integrate pending draft state and explicit `useTaskStore.createTask` confirmation into `src/components/mind/MindHubChat.tsx`
- [ ] T017 [US2] Add `ai_draft_confirmed` to the consent-aware event whitelist in `src/utils/analytics.ts` and emit it only after successful save in `src/components/mind/MindHubChat.tsx`
- [ ] T018 [US2] Preserve failed drafts for retry and mark successfully confirmed tasks for the existing recently-added dashboard list in `src/components/mind/MindHubChat.tsx`

**Checkpoint**: A task is persisted only through an explicit, single, successful confirmation.

---

## Phase 5: User Story 3 - Подтвердить разбивку на шаги (Priority: P3)

**Goal**: A user can edit the proposed breakdown and save only selected steps with one task.

**Independent Test**: Rename, remove and add draft steps, confirm, and verify one task with exactly
the final step list.

### Tests for User Story 3

- [ ] T019 [US3] Extend draft-card tests for adding, renaming, removing and reordering step positions in `src/components/mind/MindHubDraftCard.test.tsx`

### Implementation for User Story 3

- [ ] T020 [US3] Add accessible step editing, add/remove controls, empty-step cleanup and sequential positions in `src/components/mind/MindHubDraftCard.tsx`
- [ ] T021 [US3] Pass edited nested subtasks through the existing single Task API confirmation path in `src/components/mind/MindHubChat.tsx`

**Checkpoint**: One confirmed draft creates one main task and only its final selected steps.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align documentation, privacy and full verification across all stories.

- [ ] T022 [P] Update the AI boundary and explicit-confirmation flow in `docs/architecture.md`
- [ ] T023 [P] Update expected manual scenarios and final implementation notes in `specs/002-thought-unloading/quickstart.md`
- [ ] T024 Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `cd backend && npm run test`
- [ ] T025 Manually validate reply, reject, confirm, failed save and breakdown flows at desktop and 360/390/430 px using `specs/002-thought-unloading/quickstart.md`
- [ ] T026 Review `git diff` for secret/user-content leakage and ensure `src/pages/LandingPage.tsx`, `.env`, and unrelated `ai-proxy/.env.example` deletion are excluded from commits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and establishes the no-mutation MVP.
- **User Story 2 (Phase 4)**: Depends on draft delivery from User Story 1.
- **User Story 3 (Phase 5)**: Depends on the confirmation editor from User Story 2.
- **Polish (Phase 6)**: Depends on all selected stories.

### User Story Dependencies

- **US1**: No user-story dependency after the foundation.
- **US2**: Uses drafts returned by US1 but is independently testable with a supplied draft fixture.
- **US3**: Extends the US2 editor but is independently testable with a multi-step fixture.

### Within Each User Story

- Write regression tests before the corresponding implementation.
- Stabilize backend response before frontend integration.
- Keep draft state outside the task store until confirmation.
- Complete the story checkpoint before proceeding.

### Parallel Opportunities

- T004 can be prepared while T003 defines frontend types.
- T006 and T007 affect separate backend/frontend test files.
- T012 can proceed independently after canonical terminology is fixed.
- T013 and T014 affect separate component/analytics tests.
- T022 and T023 affect separate documentation files.

---

## Parallel Example: User Story 2

```text
Task T013: Add draft editor interaction tests in src/components/mind/MindHubDraftCard.test.tsx
Task T014: Add analytics whitelist tests in src/utils/analytics.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational tasks.
2. Remove all persistence from Mind Hub endpoints.
3. Render a reply plus inert drafts without changing the store.
4. Validate that ordinary questions cannot mutate tasks.

### Incremental Delivery

1. **US1**: Safe reply-only/read-only AI flow.
2. **US2**: Explicit editable task confirmation.
3. **US3**: Editable task breakdown.
4. **Polish**: docs, privacy, full checks and mobile validation.

### Commit Strategy

1. Commit specification and design artifacts.
2. Commit backend read-only draft contract with tests.
3. Commit frontend confirmation UI with tests.
4. Commit copy/docs and verification adjustments.

## Notes

- Every implementation commit uses the user-requested `feat(part): description` format.
- Never stage `.env`, user content, `src/pages/LandingPage.tsx`, or the unrelated deletion of
  `ai-proxy/.env.example`.
- No Prisma migration or production operation belongs to this task.

