# Tasks: Мобильная навигация заметок

## Phase 1: Setup

- [x] T001 Create isolated feature branch and activate `specs/017-mobile-notes-navigation` in `.specify/feature.json`

## Phase 2: Foundational

- [x] T002 Make the existing note save flow report safe success/failure in `src/pages/NotesPage.tsx`
- [x] T003 [P] Add focused Note API/page mocks and route harness in `src/pages/NotesPage.test.tsx`

## Phase 3: User Story 1 — Mobile list/editor navigation (P1)

**Goal**: Mobile shows one primary surface at a time while desktop stays two-column.

**Independent test**: Open `/notes`, select an existing note and create a blank note; verify mobile wrappers and route transitions.

- [x] T004 [US1] Add route-synchronized mobile editor state and open transitions in `src/pages/NotesPage.tsx`
- [x] T005 [US1] Add responsive list/editor wrappers and mobile heading behavior in `src/pages/NotesPage.tsx`
- [x] T006 [P] [US1] Test list, existing-note, new-note and desktop responsive states in `src/pages/NotesPage.test.tsx`

## Phase 4: User Story 2 — Safe return (P1)

**Goal**: Back never silently loses a dirty note and never creates an empty note.

**Independent test**: Return from clean, dirty, empty and failed-save editor states.

- [x] T007 [US2] Add mobile-only accessible back action in `src/components/notes/NoteEditor.tsx`
- [x] T008 [US2] Save before return and keep editor open on failure in `src/pages/NotesPage.tsx`
- [x] T009 [P] [US2] Test successful save, failed save, saving guard and empty draft behavior in `src/pages/NotesPage.test.tsx`

## Phase 5: User Story 3 — Route and archive continuity (P2)

**Goal**: Direct links, browser navigation and archive actions land on the correct mobile surface.

**Independent test**: Open `/notes/:id`, navigate back and archive/restore a note.

- [x] T010 [US3] Align direct route, browser back and archive completion with mobile surface state in `src/pages/NotesPage.tsx`
- [x] T011 [P] [US3] Test direct route, browser back and archive return in `src/pages/NotesPage.test.tsx`

## Phase 6: Cross-platform verification

- [x] T012 Add 320/360/390/430 px and desktop flow coverage in `e2e/mobile-notes-navigation.spec.ts`
- [x] T013 Run focused tests after implementation and resolve regressions
- [x] T014 Run frontend typecheck, lint, full unit/component tests and production build
- [x] T015 Run relevant and full Playwright suites; record evidence and residual risks here
- [x] T016 Run `$speckit-converge`, update roadmap status and complete rollback notes

## Dependencies

```text
T001 -> T002 -> T004-T005 -> T007-T008 -> T010
          \-> T003/T006/T009/T011
T010 + tests -> T012 -> T013 -> T014 -> T015 -> T016
```

## Implementation Strategy

1. Preserve and expose current save outcome.
2. Add mobile surface state without changing desktop.
3. Add safe back and archive continuity.
4. Verify focused flows and target widths before full gates.

## Verification Evidence

- `npm run test -- src/pages/NotesPage.test.tsx` — 12/12 passed, including the two pre-existing AI-draft dialog checks and two loading/race regressions.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test` — 58 files, 183 tests passed.
- `npm run build` — passed.
- `npx playwright test e2e/mobile-notes-navigation.spec.ts` — 4/4 passed across both browser profiles.
- `npm run test:e2e` — 123 passed, 1 intentionally skipped (124 total).
- Initial convergence audit — the 16 implementation tasks are complete; two documentation/regression-verification follow-ups are listed below.

## Phase 7: Convergence

- [x] T017 Align the documented mobile navigation model with route-derived `mobileEditorOpen` and `newNoteOpen` in `data-model.md`, `research.md` and `plan.md` per plan: implementation design (partial).
- [x] T018 Add focused regression coverage for a disabled editor during initial loading and a delayed list response that must not overwrite edited text in `src/pages/NotesPage.test.tsx` per SC-003 and Edge Cases (partial).
