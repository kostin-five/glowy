# Tasks: Понятный диалог Glowy AI

## Phase 1: Setup

- [x] T001 Confirm the active feature metadata and clean isolated branch in `.specify/feature.json` and `specs/016-readable-ai-dialog/plan.md`

## Phase 2: Foundational

- [x] T002 Extend and normalize optional message metadata without dropping legacy messages in `src/store/useMindHubStore.ts`
- [x] T003 [P] Add legacy and enriched-message persistence coverage in `src/store/useMindHubStore.test.ts`

## Phase 3: User Story 1 — Начать диалог (P1)

**Goal**: Empty Glowy AI explains its purpose and prepares editable requests without sending.

**Independent test**: Select all three starter actions and verify composer updates while AI/task mocks remain untouched.

- [x] T004 [US1] Add three Russian starter prompt definitions and safe composer-fill behavior in `src/components/mind/MindHubChat.tsx`
- [x] T005 [US1] Replace the single welcome bubble with responsive empty-state starter actions in `src/components/mind/MindHubChat.tsx`
- [x] T006 [P] [US1] Test starter visibility, non-destructive fill, focus and zero automatic requests in `src/components/mind/MindHubChat.test.tsx`

## Phase 4: User Story 2 — Читать результат (P1)

**Goal**: Conversation roles/times are clear and confirmed task creation has a visible result card.

**Independent test**: Confirm a returned draft and verify a persisted linked-task card opens the existing tasks route.

- [x] T007 [US2] Render role labels, valid local times and optional linked-task result cards in `src/components/mind/MindHubChat.tsx`
- [x] T008 [US2] Append linked-task metadata only after existing explicit draft confirmation succeeds in `src/components/mind/MindHubChat.tsx`
- [x] T009 [P] [US2] Test message metadata, explicit task confirmation and linked-task navigation in `src/components/mind/MindHubChat.test.tsx`

## Phase 5: User Story 3 — Управлять историей (P2)

**Goal**: Destructive local clearing is confirmed and long conversations expose a return-to-latest control.

**Independent test**: Cancel then confirm clearing, and verify the jump control restores bottom auto-scroll.

- [x] T010 [US3] Add accessible inline clear confirmation and sending guard in `src/components/mind/MindHubChat.tsx`
- [x] T011 [US3] Track scroll position and add an accessible jump-to-latest action in `src/components/mind/MindHubChat.tsx`
- [x] T012 [P] [US3] Test cancel/confirm clear behavior and jump-to-latest behavior in `src/components/mind/MindHubChat.test.tsx`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T013 Run focused store/chat tests and resolve regressions in `src/store/useMindHubStore.test.ts` and `src/components/mind/MindHubChat.test.tsx`
- [x] T014 Run frontend typecheck, lint, unit/component suite and production build documented in `specs/016-readable-ai-dialog/quickstart.md`
- [x] T015 Run relevant Playwright smoke coverage and record final evidence in `specs/016-readable-ai-dialog/tasks.md`
- [x] T016 Review 320/360/390/430 px layout and complete rollback/risk notes in `specs/016-readable-ai-dialog/quickstart.md`

## Dependencies

```text
T001 -> T002 -> US1 (T004-T006)
             -> US2 (T007-T009)
             -> US3 (T010-T012)
US1 + US2 + US3 -> T013 -> T014 -> T015 -> T016
```

- T003 can run after T002 while UI work starts.
- US2 depends on the optional message metadata from T002.
- US1 and most of US3 are otherwise independently testable.

## Parallel Examples

- After T002, store tests T003 and starter UI T004-T005 touch different files.
- Within each story, test tasks marked `[P]` may be prepared alongside implementation once the UI contract is stable.

## Implementation Strategy

1. Preserve legacy data first.
2. Ship the empty-state guidance as the smallest visible increment.
3. Add the confirmed-task result card without changing task creation.
4. Add destructive-action and long-scroll safeguards.
5. Run focused checks after each increment, then the standard frontend and Playwright gates.

## Verification Evidence

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test` — 58 files, 173 tests passed.
- `npm run build` — passed.
- `npm run test:e2e` — 119 passed, 1 intentionally skipped.
- Feature Playwright coverage — desktop/mobile starter, explicit send/clear and 320/360/390/430 px overflow checks passed.
