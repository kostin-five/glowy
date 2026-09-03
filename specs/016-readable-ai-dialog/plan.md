# Implementation Plan: Понятный диалог Glowy AI

**Branch**: `codex/readable-ai-dialog` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-readable-ai-dialog/spec.md`

## Summary

Усилить существующий `MindHubChat`: дать полезный пустой экран со стартовыми запросами, сделать сообщения легче различимыми, добавить подтверждение локальной очистки, кнопку перехода к последним сообщениям и локальную карточку задачи после явного сохранения AI-черновика. Существующие AI/task API, backend и схема данных не меняются; старые `role/text` сообщения продолжают загружаться.

## Technical Context

**Language/Version**: React 18, TypeScript 5.8, browser ES modules

**Primary Dependencies**: Zustand persist, React Router, Lucide React, existing `AiApi` and `useTaskStore`

**Storage**: Browser localStorage with conversations partitioned by account scope; PostgreSQL only through unchanged task creation API

**Testing**: Vitest + Testing Library, TypeScript typecheck, ESLint, Vite production build, existing Playwright suites

**Target Platform**: Modern desktop/mobile browsers and Telegram Mini App at 320–430 px

**Project Type**: React web application with an unchanged Express backend

**Performance Goals**: Starter selection and local controls respond within one frame; conversation rendering remains smooth for the existing bounded local history

**Constraints**: Russian UI; explicit task confirmation; no hidden task context; no server chat history; backward-compatible local persistence; no landing, backend, DB, env or production changes

**Scale/Scope**: One chat component, one local store, focused component/store tests and feature documentation

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **User control**: PASS — starter prompts never send automatically; only existing explicit draft confirmation creates a task.
- **Existing architecture**: PASS — extends `MindHubChat`, `useMindHubStore` and the current task store; no parallel AI/task flow.
- **Data and secrets**: PASS — no secret access, new logs, hidden context, backend storage, DB or payment change.
- **Evidence**: PASS — store compatibility, UI interaction and task confirmation receive focused tests plus the standard frontend checks.
- **Clarity and Russian UI**: PASS — user-visible copy remains Russian; local-state evolution and rollback are documented.

Post-design re-check: PASS. The UI contract and local model add only optional fields, preserving legacy messages and current server boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/016-readable-ai-dialog/
├── checklists/requirements.md
├── contracts/ui-contract.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/mind/
│   ├── MindHubChat.tsx
│   ├── MindHubChat.test.tsx
│   └── MindHubDraftCard.tsx
└── store/
    ├── useMindHubStore.ts
    └── useMindHubStore.test.ts
e2e/
└── readable-ai-dialog.spec.ts
```

**Structure Decision**: Улучшение остаётся внутри существующих frontend-компонента и Zustand store. Новые server route, API client, task store или persistence layer не создаются.

## Implementation Design

1. Перевести единое legacy-состояние в совместимую account-scoped карту и расширить сообщение необязательными `createdAt` и `linkedTask`, не удаляя валидные `role/text` записи.
2. После существующего `createTask` добавлять assistant-сообщение с `linkedTask`; обычная строка ответа остаётся доступной fallback-информацией.
3. Заменить одиночный welcome bubble на семантический empty state с тремя кнопками, которые вызывают один helper заполнения composer.
4. Отображать автора/время и необязательную task card внутри bubble без отдельного источника данных.
5. Ввести локальные UI-состояния подтверждения очистки и видимости кнопки перехода вниз; блокировать очистку во время отправки.
6. Проверить page/quick варианты, legacy persistence, отсутствие автоматического API-вызова и сохранение явного подтверждения задачи.

## Rollback

UI-элементы можно удалить независимо. Store продолжит понимать базовые `id/role/text`; дополнительные поля опциональны и не затрагивают server/DB. Для полного отката достаточно вернуть компонент и store к предыдущему commit — существующие задачи останутся без изменений.

## Complexity Tracking

Нарушений конституции и новых архитектурных уровней нет.
