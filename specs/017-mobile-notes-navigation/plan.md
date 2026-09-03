# Implementation Plan: Мобильная навигация заметок

**Branch**: `codex/mobile-notes-navigation` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

## Summary

Разделить mobile Notes на два последовательных экрана внутри существующей страницы: список и редактор. Сохранить маршруты, API, desktop-компоновку и все функции заметок; добавить безопасный возврат, который не закрывает редактор при ошибке сохранения.

## Technical Context

**Language/Version**: React 18, TypeScript 5.8

**Primary Dependencies**: React Router, Lucide React, existing `NoteApi`, existing task store

**Storage**: Unchanged PostgreSQL-backed notes API; local component state only for navigation

**Testing**: Vitest + Testing Library, TypeScript, ESLint, Vite build, Playwright

**Target Platform**: Desktop browsers and mobile/Telegram widths 320–430 px

**Constraints**: Russian UI; no backend/DB/auth/AI/payment/Telegram/landing/env/production changes; reuse current save and route flows

**Scale/Scope**: `NotesPage`, `NoteEditor`, focused tests and docs

## Constitution Check

- **User control**: PASS — user explicitly chooses note/new/back; no AI or data mutation is added.
- **Existing architecture**: PASS — extends current page, editor, router and `NoteApi`; no alternate store or route family.
- **Data safety**: PASS — editor only closes after save success; no secrets, logs, schema or production access.
- **Evidence**: PASS — component flow, mobile widths and standard frontend gates are included.
- **Clarity**: PASS — all new UI text is Russian and rollback is frontend-only.

Post-design re-check: PASS. Research and UI contract preserve all server boundaries.

## Project Structure

```text
specs/017-mobile-notes-navigation/
├── checklists/requirements.md
├── contracts/ui-contract.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md

src/
├── components/notes/NoteEditor.tsx
└── pages/
    ├── NotesPage.tsx
    └── NotesPage.test.tsx
e2e/
└── mobile-notes-navigation.spec.ts
```

## Implementation Design

1. Сделать `save()` наблюдаемым как `Promise<boolean>` без изменения create/update payload.
2. Вычислять `mobileEditorOpen` из optional `noteId` route и page-local `newNoteOpen`, не синхронизируя state через effect.
3. Открывать editor при select/new; закрывать после safe back и archive success.
4. Переключать list/editor responsive wrappers только ниже `lg`; скрыть дублирующий heading в editor mode.
5. Добавить mobile-only accessible back control в существующий `NoteEditor`.
6. Покрыть route, create/update failure, empty draft, desktop compatibility и 320–430 px overflow.

## Rollback

Frontend-only revert. Существующие заметки и API не преобразуются, поэтому rollback не требует миграции или очистки данных.

## Complexity Tracking

Новых архитектурных уровней и нарушений конституции нет.
