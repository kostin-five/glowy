# Tasks: Неблокирующая серверная история Glowy AI

## Phase 1: Setup

- [x] T001 Add additive conversation and exchange models in `backend/prisma/schema.prisma`
- [x] T002 Add reviewed SQL-only migration in `backend/prisma/migrations/20260812000000_add_ai_history/migration.sql`
- [x] T003 Generate Prisma Client locally without applying database changes in `backend/`

## Phase 2: Foundational

- [x] T004 [P] Add history payload validation in `backend/services/ai/ai-history.validation.js`
- [x] T005 [P] Add database-free validation tests in `backend/test/ai-history.validation.test.js`
- [x] T006 Implement owner-scoped history service with dependency injection in `backend/services/ai/ai-history.service.js`
- [x] T007 Add database-free owner, pagination and idempotency tests in `backend/test/ai-history.service.test.js`

## Phase 3: User Story 1 - Persistent conversation without regressions (P1)

**Goal**: Synchronize registered history when available and preserve every existing chat function when unavailable.

**Independent test**: Disable history storage, then verify message sending, voice input, local drafts and explicit task creation still work.

- [x] T008 [US1] Add authenticated history endpoint and best-effort persistence to `backend/routes/ai.routes.js`
- [x] T009 [US1] Keep provider success independent from history failures in `backend/routes/ai.routes.js`
- [x] T010 [US1] Add history contracts and non-blocking fallback to `src/api/AiApi.ts`
- [x] T011 [US1] Add server replace/prepend operations without removing local fallback in `src/store/useMindHubStore.ts`
- [x] T012 [US1] Load and paginate history without disabling the composer in `src/components/mind/MindHubChat.tsx`
- [x] T013 [US1] Add a calm synchronization status that preserves local chat in `src/components/mind/MindHubChat.tsx`
- [x] T014 [US1] Add regression tests for history success, unavailable storage, chat sending, voice and local drafts in `src/components/mind/MindHubChat.test.tsx` and `src/store/useMindHubStore.test.ts`

## Phase 4: User Story 2 - Private deletion (P2)

**Goal**: Let the owner clear synchronized history without deleting local functionality or tasks.

**Independent test**: Confirm clear on available storage and verify failure leaves the visible local conversation intact.

- [x] T015 [US2] Add owner-scoped history deletion in `backend/services/ai/ai-history.service.js` and `backend/routes/ai.routes.js`
- [x] T016 [US2] Add confirmed clear API and graceful failure UI in `src/api/AiApi.ts` and `src/components/mind/MindHubChat.tsx`
- [x] T017 [US2] Add deletion and failure regression tests in `backend/test/ai-history.service.test.js` and `src/components/mind/MindHubChat.test.tsx`

## Phase 5: Polish & Verification

- [x] T018 [P] Verify private text is absent from history error logs in `backend/test/ai-history.logging.test.js`
- [x] T019 [P] Update architecture and roadmap status in `docs/architecture.md` and `docs/product-roadmap.md`
- [x] T020 Run frontend typecheck, lint, unit tests and build from repository root
- [x] T021 Run the database-free backend test suite from `backend/`
- [x] T022 Validate and generate Prisma Client without applying the migration in `backend/`
- [ ] T023 Manually validate against an explicitly approved local/dev database using `specs/004-ai-history-task-builder/quickstart.md`

## Dependencies

- Phase 2 depends on Phase 1.
- User Story 1 depends on Phase 2 and is the MVP.
- User Story 2 depends on owner-scoped history from User Story 1.
- Production migration and deploy are outside this implementation.

## Implementation Strategy

1. Add storage and pure tests first.
2. Persist and load history only as best effort.
3. Prove all existing chat paths work while history storage is unavailable.
4. Add clear-history behavior after the non-blocking path is stable.
5. Never apply the migration to production during this work.

## Phase 6: Convergence

- [x] T024 Scope persisted local messages and drafts to the current account so an auth change cannot reveal another account's cached content per Edge Case: auth loss (partial)
- [x] T025 Deduplicate server message IDs during history replacement and prepend per FR-003 and US1/AC3 (partial)
- [x] T026 Add a backend regression test proving a history storage failure cannot suppress a successful AI response per SC-006 and FR-022 (partial)
