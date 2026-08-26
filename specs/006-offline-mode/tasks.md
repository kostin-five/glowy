# Tasks: Offline-режим задач

## Phase 1: Setup

- [x] T001 Add shared offline data types in `src/offline/taskOfflineTypes.ts`
- [x] T002 [P] Add release documentation in `docs/releases/v2.6.0-offline-mode.md`

## Phase 2: Foundational

- [x] T003 Implement owner-scoped IndexedDB snapshots and operations in `src/offline/taskOfflineDb.ts`
- [x] T004 [P] Implement temporary IDs, queue compaction and error classification in `src/offline/taskOfflineQueue.ts`
- [x] T005 [P] Add queue helper unit tests in `src/offline/taskOfflineQueue.test.ts`
- [x] T006 Return stable user IDs from login/register in `backend/routes/auth.routes.js` and type them in `src/api/AuthApi.ts`
- [x] T007 Persist user ID and retain a known session only on network failure in `src/store/useAuthStore.ts`

## Phase 3: User Story 1 - Открыть задачи без интернета (P1)

**Independent test**: Load tasks online, disable network, reload and see only that account's cached tasks.

- [x] T008 [US1] Add owner initialization, snapshot hydration and session clearing in `src/store/useTaskStore.ts`
- [x] T009 [US1] Initialize offline data before protected task loading in `src/App.tsx`
- [x] T010 [US1] Prevent authenticated snapshots from leaking through Zustand localStorage in `src/store/useTaskStore.ts`
- [x] T011 [P] [US1] Add cached reload and account-isolation scenarios in `e2e/offline.spec.ts`

## Phase 4: User Story 2 - Изменить задачи офлайн (P1)

**Independent test**: Offline CRUD/toggle for tasks and subtasks survives page reload without HTTP success.

- [x] T012 [US2] Convert task mutations to durable local-first commands in `src/store/useTaskStore.ts`
- [x] T013 [US2] Convert subtask mutations to durable local-first commands in `src/store/useTaskStore.ts`
- [x] T014 [US2] Persist every local mutation and delayed delete outcome in `src/store/useTaskStore.ts`
- [x] T015 [P] [US2] Extend offline Playwright coverage for task and subtask mutations in `e2e/offline.spec.ts`

## Phase 5: User Story 3 - Автоматически синхронизировать изменения (P1)

**Independent test**: Restore network after 20 queued actions and observe ordered replay, ID remap and an empty queue.

- [x] T016 [US3] Implement ordered replay, ID remapping, Web Locks and BroadcastChannel in `src/offline/taskOfflineSync.ts`
- [x] T017 [US3] Connect reconnect, manual retry and fresh server snapshot to `src/store/useTaskStore.ts`
- [x] T018 [P] [US3] Build sync status and retry control in `src/components/OfflineSyncStatus.tsx`
- [x] T019 [US3] Mount the global sync status in `src/layout/AppLayout.tsx`
- [x] T020 [US3] Add reconnect and blocked-operation Playwright scenarios in `e2e/offline.spec.ts`

## Phase 6: User Story 4 - Понимать ограничения offline-режима (P2)

**Independent test**: Open AI/payment/auth without network and receive an explanation without spending AI usage or sending mutation requests.

- [x] T021 [US4] Add a reusable offline capability guard in `src/hooks/useNetworkStatus.ts`
- [x] T022 [US4] Guard Mind Hub requests and show a calm offline message in the existing dashboard AI flow
- [x] T023 [US4] Keep guest behavior unchanged and document unsupported network features in `docs/releases/v2.6.0-offline-mode.md`

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T024 Run frontend typecheck, lint, unit tests and production build
- [x] T025 Run backend HTTP tests and Playwright offline/smoke checks
- [x] T026 Verify `spec.md`, `plan.md`, `tasks.md`, roadmap and release notes match the implementation

## Dependencies

- Phase 2 blocks all user stories.
- US1 blocks US2 because mutations require an isolated hydrated owner.
- US2 blocks US3 because replay consumes its durable commands.
- US4 can proceed after Phase 2 in parallel with US1-US3.
- Polish starts after all stories.

## Implementation Strategy

The MVP is US1-US3: cached read, durable task/subtask mutations and reconnect replay. US4 adds explicit product boundaries without extending offline storage to AI, payments, habits or notes.
