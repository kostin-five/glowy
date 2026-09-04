# Implementation Plan: Ассистент и современные заметки

**Branch**: `codex/assistant-notes-polish` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

## Summary

Унифицировать название AI-раздела, сделать полноэкранный ассистент совместимым с персональными обоями и приблизить заметки к утверждённому визуальному направлению. Изменение остаётся frontend-only и сохраняет существующие API, состояние, автосохранение, mobile-навигацию и подтверждение AI-черновика.

## Technical Context

**Language/Version**: TypeScript, React 18  
**Primary Dependencies**: React Router, Zustand, Axios, Lucide, Tailwind CSS, Vitest, Testing Library  
**Storage**: Без новых хранилищ; существующий notes API и локальные настройки обоев  
**Testing**: Vitest + Testing Library; frontend typecheck  
**Target Platform**: Desktop web, mobile web и Telegram Mini App  
**Project Type**: React SPA с отдельным Express backend  
**Constraints**: Не менять LandingPage, backend, Prisma, production или пользовательские данные; русский интерфейс; AI не мутирует данные без подтверждения.

## Constitution Check

- **I — контроль пользователя**: PASS. AI-черновик заметки сохраняет явное подтверждение.
- **II — существующая архитектура**: PASS. Используются текущие NotesPage, NoteApi, MindHubChat и layout-компоненты.
- **III — данные и секреты**: PASS. Схема, backend и секреты не затрагиваются.
- **IV — доказательства**: PASS. Предусмотрены целевые component/page тесты и typecheck.
- **V — понятная разработка**: PASS. Русские названия и документация обновляются вместе с поведением.

## Project Structure

```text
src/
├── components/layout/       # названия desktop/mobile навигации
├── components/mind/         # полупрозрачная полноэкранная поверхность ассистента
├── components/notes/        # список, редактор и контекст заметки
└── pages/                   # композиция NotesPage и настройки стартового экрана
```

## Design Decisions

1. «Ассистент» — название раздела и экрана; «Glowy AI» остаётся брендом продукта.
2. Только page-вариант MindHubChat становится прозрачным; quick/dashboard варианты сохраняют существующую изоляцию.
3. Desktop Notes использует три визуальные зоны: список, редактор, контекст. На mobile они не стоят рядом: список и редактор остаются отдельными поверхностями, контекст складывается под текстом.
4. Макет не добавляет несуществующие теги, папки, избранное или rich text.
5. Данные и операции NoteApi остаются без изменений; редизайн — презентационный слой.

## Verification Strategy

- Сначала обновить тестовые ожидания для «Ассистент» и прозрачного page-варианта.
- Сохранить и расширить NotesPage mobile navigation tests.
- Запустить целевые Vitest-файлы для layout, MindHubChat и NotesPage.
- Запустить `npm run typecheck`.
- Полный lint/test/build остаётся в общем gate перед 3.0.0 по решению пользователя.

## Rollback

Откат выполняется одним локальным commit без миграций и данных. Старые API и маршруты не меняются, поэтому rollback не требует действий над backend или базой.

