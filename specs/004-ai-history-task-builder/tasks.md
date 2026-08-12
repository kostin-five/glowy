# Tasks: Серверная история Glowy AI

## Phase 1: Setup

- [X] T001 Add additive AI conversation, exchange and draft models in `backend/prisma/schema.prisma`
- [X] T002 Add reviewed SQL-only migration in `backend/prisma/migrations/20260812000000_add_ai_history/migration.sql`
- [X] T003 Generate Prisma Client locally without applying a database migration in `backend/node_modules/@prisma/client`

## Phase 2: Foundational

- [X] T004 [P] Add pure AI history payload validation in `backend/services/ai/ai-history.validation.js`
- [X] T005 [P] Add database-free validation tests in `backend/test/ai-history.validation.test.js`
- [X] T006 Extract reusable protected task creation in `backend/services/tasks/task-create.service.js`
- [X] T007 Update existing task POST route to use the shared service in `backend/routes/task.routes.js`
- [X] T008 Add regression tests for shared task creation behavior in `backend/test/task-create.service.test.js`

## Phase 3: User Story 1 - Persistent server conversation (P1)

**Goal**: Load and continue one private history across devices.

**Independent test**: A completed exchange created for user A is paginated for A and unavailable to B.

- [X] T009 [US1] Implement conversation lookup, reservation, completion and pagination in `backend/services/ai/ai-history.service.js`
- [X] T010 [US1] Add owner isolation, pagination and idempotency service tests in `backend/test/ai-history.service.test.js`
- [X] T011 [US1] Add authenticated history endpoint and server-backed context to `backend/routes/ai.routes.js`
- [X] T012 [US1] Add request/response history contracts to `src/api/AiApi.ts`
- [X] T013 [US1] Replace registered local history after first server load in `src/store/useMindHubStore.ts`
- [X] T014 [US1] Integrate history loading, pagination and idempotent send in `src/components/mind/MindHubChat.tsx`
- [X] T015 [US1] Add frontend store and chat tests for server load, no legacy upload and retry behavior in `src/store/useMindHubStore.test.ts` and `src/components/mind/MindHubChat.test.tsx`

## Phase 4: User Story 2 - Compact editable task builder (P2)

**Goal**: Persist compact draft edits without creating a task.

**Independent test**: Edit title, colored levels and subtasks, reopen chat, and observe the saved draft.

- [X] T016 [US2] Add versioned draft update and validation service in `backend/services/ai/ai-history.service.js`
- [X] T017 [US2] Add authenticated draft PATCH endpoint in `backend/routes/ai.routes.js`
- [X] T018 [US2] Add draft update API and conflict types in `src/api/AiApi.ts`
- [X] T019 [US2] Persist compact card edits with conflict recovery in `src/components/mind/MindHubDraftCard.tsx` and `src/components/mind/MindHubChat.tsx`
- [X] T020 [US2] Add backend and frontend tests for draft validation, colors, edits and stale versions in `backend/test/ai-history.service.test.js` and `src/components/mind/MindHubDraftCard.test.tsx`

## Phase 5: User Story 3 - Confirm or dismiss once (P3)

**Goal**: Synchronize final draft decisions and create at most one task.

**Independent test**: Confirm the same draft concurrently and verify one task; dismiss another and verify none.

- [X] T021 [US3] Implement atomic confirm and idempotent dismiss operations in `backend/services/ai/ai-history.service.js`
- [X] T022 [US3] Add confirm and dismiss endpoints in `backend/routes/ai.routes.js`
- [X] T023 [US3] Add confirm and dismiss API contracts in `src/api/AiApi.ts`
- [X] T024 [US3] Route card actions through server draft endpoints for registered users in `src/components/mind/MindHubChat.tsx`
- [X] T025 [US3] Add concurrency, repeated confirmation and dismissal tests in `backend/test/ai-history.service.test.js` and `src/components/mind/MindHubChat.test.tsx`

## Phase 6: User Story 4 - Clear private history (P4)

**Goal**: Delete server history after explicit confirmation while preserving created tasks.

**Independent test**: Clear A's history and verify it disappears for A, remains inaccessible to B and confirmed tasks remain.

- [X] T026 [US4] Implement owner-scoped conversation deletion in `backend/services/ai/ai-history.service.js`
- [X] T027 [US4] Add DELETE history endpoint in `backend/routes/ai.routes.js`
- [X] T028 [US4] Add clear-history API and confirmed UI flow in `src/api/AiApi.ts` and `src/components/mind/MindHubChat.tsx`
- [X] T029 [US4] Add deletion success/failure tests in `backend/test/ai-history.service.test.js` and `src/components/mind/MindHubChat.test.tsx`

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 [P] Update implemented architecture and roadmap status in `docs/architecture.md` and `docs/product-roadmap.md`
- [X] T031 Verify no private payload logging through backend error tests in `backend/test/ai-history.logging.test.js`
- [X] T032 Run frontend typecheck, lint, unit tests and production build from repository root
- [X] T033 Run database-free backend test suite from `backend/`
- [ ] T034 Follow `specs/004-ai-history-task-builder/quickstart.md` against an approved local/dev database without production mutation

## Dependencies

- Phase 2 depends on Phase 1.
- US1 depends on foundational schema and validation.
- US2 depends on US1 draft persistence.
- US3 depends on US2 versioned edits and shared task creation.
- US4 depends on US1 conversation ownership but can follow independently of UI polish.
- Polish depends on all implemented user stories.

## Parallel Opportunities

- T004 and T005 can start in parallel once the validation contract is fixed.
- Frontend contract typing can proceed beside backend service tests after each API shape is stable.
- T030 can proceed beside final automated verification.

## Implementation Strategy

1. Deliver US1 as the minimum server-history slice.
2. Add versioned draft persistence without changing task data.
3. Add atomic confirm/dismiss and only then switch registered UI actions.
4. Add destructive clear flow last with explicit confirmation.
5. Never apply the migration to production during implementation.

## Phase 8: Convergence

- [X] T035 Prevent registered cached history from rendering before owner-scoped server history loads per FR-001 and the lost-authorization edge case (partial)
- [X] T036 Show a calm retryable in-chat error when initial or paginated history loading fails per US1/AC4 (partial)
- [X] T037 Show a retryable UI error when server history deletion fails while preserving visible data per US4/AC3 (partial)
- [X] T038 Add database-free lifecycle tests for exchange reservation, completion, failed cleanup and duplicate request IDs per SC-008 (partial)
