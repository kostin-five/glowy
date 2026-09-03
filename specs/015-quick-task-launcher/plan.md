# Implementation Plan: Глобальное быстрое создание задачи

**Branch**: `codex/quick-task-launcher` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-quick-task-launcher/spec.md`

## Summary

Перенести владение единственным `CreateTaskModal` на уровень защищённого layout и направить к нему существующие и новые точки входа через небольшой типизированный UI-event helper. Desktop получает кнопку в Sidebar, обычный mobile — кнопку в Header, полноэкранный Glowy AI — кнопку в собственном header; TaskPage перестаёт владеть отдельным modal, но сохраняет знакомые FAB и empty-state действия.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: React Router 7, Headless UI, Zustand, lucide-react, существующий `CreateTaskModal`

**Storage**: N/A — новые данные не создаются; форма использует существующие task store/API/offline flows

**Testing**: Vitest + Testing Library, Playwright, TypeScript typecheck, ESLint, Vite production build

**Target Platform**: Современные desktop/mobile браузеры и Telegram Mini App, 320–430 px mobile

**Project Type**: React web application with existing Express backend (backend unchanged)

**Performance Goals**: Dialog становится доступен в пределах одного UI update; не добавляется сетевой запрос до явного сохранения

**Constraints**: Один экземпляр формы; русский UI; не менять landing, backend, Prisma, auth, AI, платежи или брендовые assets; не перехватывать ввод

**Scale/Scope**: 7 защищённых экранов, 4 группы точек входа, 1 общий modal lifecycle

## Constitution Check

*GATE: passed before research and re-checked after design.*

- **I — Пользовательская ценность и контроль**: launcher только открывает редактируемую форму; данные меняются после явного «Сохранить задачу».
- **II — Развитие существующей архитектуры**: переиспользуются `AppLayout`, текущие точки навигации, `CreateTaskModal`, task store/API и существующий UI-event pattern.
- **III — Защита данных, денег и секретов**: storage/backend/production/env не меняются; новые логи и пользовательские данные не вводятся.
- **IV — Доказательства перед релизом**: предусмотрены component, layout и Playwright mobile/desktop проверки плюс полный frontend gate.
- **V — Понятная совместная разработка**: пользовательский текст русский, изменения ограничены launcher/layout/task entry points, документация обновляется.
- **Architecture boundaries**: landing, backend, Prisma, AI/auth/payment/Telegram validation остаются без изменений.

## Project Structure

### Documentation (this feature)

```text
specs/015-quick-task-launcher/
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
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── *.test.tsx
│   ├── mind/
│   │   └── MindHubChat.tsx
│   └── tasks/
│       ├── GlobalTaskCreateLauncher.tsx
│       ├── taskCreateLauncher.ts
│       ├── TaskControls.tsx
│       └── *.test.tsx
├── layout/
│   ├── AppLayout.tsx
│   └── AppLayout.test.tsx
└── pages/
    └── TaskPage.tsx

e2e/
└── quick-task-launcher.spec.ts
```

**Structure Decision**: Launcher lifecycle живёт один раз в существующем защищённом `AppLayout`. Точки входа вызывают типизированное browser event через один helper; это соответствует уже используемому mobile AI pattern и не добавляет глобальный Zustand state для краткоживущего dialog.

## Complexity Tracking

Конституционных нарушений и требующих оправдания усложнений нет.
