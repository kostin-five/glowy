# Tasks: Ассистент и современные заметки

## Phase 1: Setup

- [X] T001 Verify active feature scope and current clean branch in specs/023-assistant-notes-polish/plan.md

## Phase 2: Foundational

- [X] T002 [P] Update assistant naming expectations in src/components/layout/Sidebar.test.tsx, src/components/layout/BottomNav.test.tsx and src/components/layout/GlowyAiOrb.test.tsx
- [X] T003 [P] Update full-page assistant surface expectations in src/components/mind/MindHubChat.test.tsx
- [X] T004 [P] Preserve and extend responsive notes expectations in src/pages/NotesPage.test.tsx

## Phase 3: User Story 1 — Понятная вкладка ассистента

**Goal**: Единое название и видимые обои на полном AI-экране.

**Independent Test**: Открыть `/ai` с выбранными обоями и проверить название, фон и доступность действий.

- [X] T005 [US1] Rename assistant navigation in src/components/layout/Sidebar.tsx, src/components/layout/BottomNav.tsx, src/components/layout/GlowyAiOrb.tsx and src/pages/SettingsPage.tsx
- [X] T006 [US1] Make only the page assistant surface wallpaper-aware in src/components/mind/MindHubChat.tsx

## Phase 4: User Story 2 — Современная рабочая область заметок

**Goal**: Современная desktop/mobile компоновка без изменения данных.

**Independent Test**: Пройти поиск, открытие, изменение, сохранение, архив, связи и AI-черновик заметки.

- [X] T007 [US2] Refresh responsive notes page composition in src/pages/NotesPage.tsx
- [X] T008 [US2] Redesign the note list hierarchy using existing data in src/components/notes/NoteList.tsx
- [X] T009 [US2] Redesign editor and context surfaces while preserving actions in src/components/notes/NoteEditor.tsx

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 Run focused layout, assistant and notes tests (35/35 Vitest, 16/16 Playwright, focused ESLint)
- [x] T011 Run frontend typecheck
- [x] T012 Update current feature documentation and handoff notes in specs/023-assistant-notes-polish/, docs/product-roadmap.md, docs/architecture.md and docs/handoffs/PROJECT_HANDOFF_2026-09-04.md

## Dependencies

- T001 precedes all work.
- T002–T004 precede their matching implementation tasks.
- T005 and T006 complete User Story 1 independently.
- T007–T009 complete User Story 2 in file dependency order.
- T010–T012 follow both stories.

## Implementation Strategy

Implement naming and wallpaper compatibility first as the smallest visible slice, then modernize Notes without altering API or storage. Preserve existing mobile navigation tests as the regression boundary.
