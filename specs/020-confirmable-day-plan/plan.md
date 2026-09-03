# Implementation Plan: Подтверждаемый план дня

**Branch**: `codex/confirmable-day-plan` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Вынести выбор задач для «Фокуса дня» в чистую детерминированную модель и добавить обзор плана в
существующую Главную. Обзор показывает до трёх рекомендаций, объясняет первую, позволяет изменить
выбор и только после явного подтверждения назначает сегодняшнюю дату через существующий task store.
Новые backend/API/AI/storage механизмы не требуются.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, браузерный ESM
**Primary Dependencies**: Zustand, Headless UI, Lucide, Vitest, Testing Library, Playwright, Vite
**Storage**: существующий task store и его offline queue; новых сущностей и persistence нет
**Testing**: pure Vitest tests, Testing Library integration, Playwright desktop/mobile, typecheck/lint/build
**Target Platform**: desktop web и mobile/Telegram WebView шириной 320–430 px
**Project Type**: React SPA с существующим Express backend без изменений
**Performance Goals**: синхронный расчёт плана для типового списка задач; UI подтверждения без сетевых запросов до submit
**Constraints**: русские тексты; read-only карточки Главной; явное подтверждение; без AI/API/БД/env/production/LandingPage
**Scale/Scope**: одна pure-модель, один review dialog, интеграция Dashboard и ограниченные события аналитики

## Constitution Check

### Before design

- **I. Пользовательская ценность и контроль**: pass — изменения дат возможны только после явного подтверждения выбранного списка.
- **II. Развитие существующей архитектуры**: pass — переиспользуются Dashboard, Modal и `useUpdateTask`; новых слоёв нет.
- **III. Защита данных, денег и секретов**: pass — backend/БД/оплата не меняются; в события не попадает текст задач.
- **IV. Доказательства перед релизом**: pass — pure, component и desktop/mobile e2e сценарии включены.
- **V. Понятная совместная разработка**: pass — русская UI-копия, узкий commit, контракты и rollback документированы.

### After design

Pass без исключений. Pure-модель отделяет проверяемое ранжирование от UI, а dialog использует
существующее обновление задач. Новых контрактов backend, схемы данных или внешних зависимостей нет.

## Project Structure

### Documentation (this feature)

```text
specs/020-confirmable-day-plan/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/day-plan-ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── dashboard/
│   ├── dayPlan.ts
│   └── dayPlan.test.ts
├── components/dashboard/
│   ├── DayPlanReviewDialog.tsx
│   └── DayPlanReviewDialog.test.tsx
├── pages/
│   ├── DashboardPage.tsx
│   └── DashboardPage.test.tsx
└── utils/
    ├── analytics.ts
    └── analytics.test.ts
e2e/dashboard-day-plan.spec.ts
docs/product-roadmap.md
```

**Structure Decision**: алгоритм живёт в существующей dashboard-области, reusable dialog — в
`components/dashboard`, а route остаётся местом композиции с store. Дублировать task API нельзя.

## Design Phases

1. Зафиксировать pure ranking/capacity/rationale и UI/apply contract тестами.
2. Реализовать pure-модель и обзор без мутаций до подтверждения.
3. Подключить существующий `updateTask`, полный/частичный результат и безопасные продуктовые события.
4. Проверить desktop/mobile, offline-compatible store path, полный frontend gate и rollback.

## Rollback

Revert одного feature commit. Новых данных, миграций, env, backend и внешних переключателей нет;
существующие даты, уже подтверждённые пользователем до rollback, остаются обычными датами задач.

## Complexity Tracking

Нарушений конституции и оправданий дополнительной сложности нет.
