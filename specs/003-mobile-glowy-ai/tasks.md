# Tasks: Мобильный Glowy AI

**Input**: Design documents from `/specs/003-mobile-glowy-ai/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required for shared conversation state, modal navigation, route behavior and preservation
of the explicit-confirmation AI boundary.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the UI contract and identify the existing extension points.

- [ ] T001 Record mobile navigation, sheet, route and SVG accessibility contracts in `specs/003-mobile-glowy-ai/contracts/mobile-ai-ui.md`
- [ ] T002 Verify router, layout, Headless UI modal and Testing Library patterns in `src/App.tsx`, `src/layout/AppLayout.tsx`, `src/components/ui/Modal.tsx`, and existing tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Share one safe conversation between the quick and full surfaces.

- [ ] T003 Add validated browser-local messages and pending draft state in `src/store/useMindHubStore.ts`
- [ ] T004 [P] Add migration, invalid-payload, draft lifecycle and clear-state tests in `src/store/useMindHubStore.test.ts`
- [ ] T005 Refactor `src/components/mind/MindHubChat.tsx` to use the shared conversation store without changing `AiApi` or Task API boundaries
- [ ] T006 [P] Add chat regression tests for reply-only output, unsaved draft output and explicit confirmation in `src/components/mind/MindHubChat.test.tsx`

**Checkpoint**: Two mounted chat surfaces observe one conversation, while drafts remain outside the task store until confirmation.

---

## Phase 3: User Story 1 - Быстро открыть Glowy AI (Priority: P1) 🎯 MVP

**Goal**: Show the five-item navigation and accessible animated central button on mobile.

**Independent Test**: At 390 px open/close one AI sheet from multiple protected routes without navigation or stale backdrop.

### Tests for User Story 1

- [ ] T007 [P] [US1] Add navigation order, central trigger, single-sheet and close interaction tests in `src/components/layout/BottomNav.test.tsx`
- [ ] T008 [P] [US1] Add reduced-motion and accessible-name assertions for the central orb in `src/components/layout/GlowyAiOrb.test.tsx`

### Implementation for User Story 1

- [ ] T009 [P] [US1] Build the code-native animated and reduced-motion-safe SVG orb in `src/components/layout/GlowyAiOrb.tsx`
- [ ] T010 [US1] Build the accessible Headless UI quick bottom sheet shell in `src/components/layout/MobileAiSheet.tsx`
- [ ] T011 [US1] Replace mobile navigation order and integrate mutually exclusive panel state in `src/components/layout/BottomNav.tsx`
- [ ] T012 [US1] Update safe-area spacing and prevent content overlap in `src/layout/AppLayout.tsx`

**Checkpoint**: The new central mobile interaction works without changing any data.

---

## Phase 4: User Story 2 - Быстрая разгрузка и подтверждение (Priority: P2)

**Goal**: Use the existing safe AI flow inside the mobile sheet.

**Independent Test**: A normal question creates no task; a confirmed editable draft creates exactly one task.

### Tests for User Story 2

- [ ] T013 [US2] Extend compact chat tests for error state, draft reject and successful confirmation in `src/components/mind/MindHubChat.test.tsx`

### Implementation for User Story 2

- [ ] T014 [US2] Add `quick`, `page`, and existing dashboard visual variants without duplicating behavior in `src/components/mind/MindHubChat.tsx`
- [ ] T015 [US2] Mount the compact chat and Russian close/full-chat actions in `src/components/layout/MobileAiSheet.tsx`
- [ ] T016 [US2] Avoid mounting the dashboard chat below the desktop breakpoint while preserving its desktop ref behavior in `src/pages/DashboardPage.tsx`

**Checkpoint**: Quick AI is fully usable and preserves explicit confirmation.

---

## Phase 5: User Story 3 - Отдельный полный чат (Priority: P3)

**Goal**: Continue the same browser-local conversation on protected route `/ai`.

**Independent Test**: Start in the sheet, open `/ai`, see current messages and continue the conversation.

### Tests for User Story 3

- [ ] T017 [P] [US3] Add full-page heading and shared-chat render tests in `src/pages/GlowyAiPage.test.tsx`
- [ ] T018 [P] [US3] Add protected `/ai` route source/regression coverage in `src/App.test.tsx`

### Implementation for User Story 3

- [ ] T019 [US3] Create the full Glowy AI chat page in `src/pages/GlowyAiPage.tsx`
- [ ] T020 [US3] Register lazy protected `/ai` routing in `src/App.tsx`
- [ ] T021 [US3] Close the quick sheet before navigating from `src/components/layout/MobileAiSheet.tsx` to `/ai`

**Checkpoint**: Quick and full entry points share one current conversation and one AI flow.

---

## Phase 6: User Story 4 - Прогресс и «Ещё» (Priority: P4)

**Goal**: Preserve access to progress, analytics and settings in the new five-slot navigation.

**Independent Test**: Open progress directly and analytics/settings from More with the panel closing after selection.

### Tests for User Story 4

- [ ] T022 [US4] Extend navigation tests for `/stairs`, More, `/analytics`, `/settings`, active states and route-change close in `src/components/layout/BottomNav.test.tsx`

### Implementation for User Story 4

- [ ] T023 [US4] Build the accessible More bottom sheet with existing destinations in `src/components/layout/MobileMoreSheet.tsx`
- [ ] T024 [US4] Integrate More and progress active states into `src/components/layout/BottomNav.tsx`

**Checkpoint**: All current primary mobile destinations remain reachable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate responsive, accessibility, architecture and privacy boundaries.

- [ ] T025 [P] Document the shared conversation and mobile navigation boundaries in `docs/architecture.md`
- [ ] T026 [P] Mark the completed navigation slice without claiming voice/server history in `docs/product-roadmap.md`
- [ ] T027 [P] Update final verification notes in `specs/003-mobile-glowy-ai/quickstart.md`
- [ ] T028 Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`
- [ ] T029 Manually validate light/dark/reduced-motion and 360/390/430 px scenarios from `specs/003-mobile-glowy-ai/quickstart.md`
- [ ] T030 Review diff for user text/secrets, verify `src/pages/LandingPage.tsx` is untouched, and exclude unrelated `ai-proxy/.env.example` deletion from commits

---

## Dependencies & Execution Order

- Setup precedes shared conversation state.
- Foundational state and chat refactor block both AI surfaces.
- US1 establishes navigation and sheet shell.
- US2 fills the sheet with the existing safe AI flow.
- US3 adds the full page after shared state is stable.
- US4 completes navigation destinations and may proceed after the US1 shell.
- Polish follows all user stories.

## Parallel Opportunities

- T004 can run while T003 is implemented against the agreed store contract.
- T008/T009 affect the isolated orb while T010 prepares the sheet shell.
- T017/T018 cover different page/router files.
- T025/T026/T027 affect separate documentation files.

## Implementation Strategy

1. Stabilize shared local conversation state with tests.
2. Deliver the central orb and accessible empty sheet as the P1 increment.
3. Reuse the chat inside the sheet without changing backend behavior.
4. Add `/ai`, then More/progress navigation.
5. Verify mobile viewports and desktop regression before focused commits.

## Notes

- Every implementation commit uses `feat(part): description` in English.
- Do not stage `.env`, `src/pages/LandingPage.tsx`, user content or the unrelated deletion of `ai-proxy/.env.example`.
- No backend, Prisma migration, production or deployment action belongs to this feature.
