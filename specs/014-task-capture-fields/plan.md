# Implementation Plan: Быстрое создание и режимы полей задачи

**Branch**: `codex/task-capture-fields` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-task-capture-fields/spec.md`

## Summary

Ускорить создание задачи до title-first сценария и добавить единое progressive disclosure для create/edit: режимы «Коротко», «Средне», «Полно» и независимая видимость энергии/приоритета. Реализация расширяет существующий Zustand settings store и текущие task modal-компоненты, сохраняет существующий TaskDraft/API/offline contract и не требует backend, Prisma migration или нового AI-flow.

## Technical Context

**Language/Version**: TypeScript 6.0, React 19

**Primary Dependencies**: Zustand 5, Headless UI Dialog, Zod 4, Tailwind CSS 4, существующий task store и offline queue

**Storage**: Существующие PostgreSQL task records без изменения; account-scoped localStorage только для UI-предпочтений формы

**Testing**: Vitest + Testing Library, Playwright, TypeScript typecheck, ESLint, Vite production build

**Target Platform**: Современные desktop/mobile браузеры, PWA и Telegram Mini App webview; обязательные mobile widths 320/360/390/430 px

**Project Type**: React web/PWA client с существующим Express API

**Performance Goals**: Открытие формы без дополнительного сетевого запроса; title-first создание не добавляет новый backend round trip

**Constraints**: Mobile-first, offline-capable, русский UI, сохранение task-date `YYYY-MM-DD | ""`, отсутствие schema/env/production изменений, landing page неизменна

**Scale/Scope**: Два task modal-компонента, один settings store, один settings section, общие UI helpers и сфокусированные unit/e2e проверки

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

- **Пользовательская ценность и контроль — PASS.** Быстрый ввод сокращает трение; AI ничего не применяет и не получает нового endpoint.
- **Развитие существующей архитектуры — PASS.** Переиспользуются текущие forms, store, TaskDraft, API и offline flow; параллельная модель задач не создаётся.
- **Защита данных, денег и секретов — PASS.** Новых секретов, платежей, тарифов, логирования пользовательского текста или server-side trust нет.
- **Доказательства перед релизом — PASS.** План включает store/component tests, существующие task/offline suites, mobile Playwright, typecheck, lint и build.
- **Понятная совместная разработка — PASS.** Изменения разделены на settings foundation, shared form presentation и create/edit integration; docs обновляются вместе с поведением.
- **Production/data gate — PASS.** Prisma schema, migrations, production DB/env/deploy/backup не затрагиваются.

Post-design re-check: все gates остаются PASS; UI preference не меняет публичный task contract и может быть откатана удалением client-side presentation code без data rollback.

## Project Structure

### Documentation (this feature)

```text
specs/014-task-capture-fields/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── tasks/
│   │   ├── CreateTaskModal.tsx
│   │   ├── EditTaskModal.tsx
│   │   └── TaskFormModeControl.tsx
│   └── ui/
│       └── Modal.tsx
├── pages/
│   ├── TaskPage.tsx
│   └── SettingsPage.tsx
├── store/
│   ├── useSettingsStore.ts
│   └── useSettingsStore.test.ts
└── types/
    └── index.ts

e2e/
└── task-capture-fields.spec.ts
```

**Structure Decision**: Функция остаётся frontend-only слоем представления над существующим task contract. Общие определения режима и selectors живут рядом с текущими UI-настройками; create/edit переиспользуют один набор правил видимости. Backend и contracts package меняются только если тесты докажут фактическую несовместимость, чего план не ожидает.

## Complexity Tracking

Нарушений конституции и оправдываемых усложнений нет.
