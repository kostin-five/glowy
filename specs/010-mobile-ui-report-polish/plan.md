# Implementation Plan: Мобильная полировка и устойчивые отчёты

**Branch**: `codex/v2.8.0-stabilization-behavior` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-mobile-ui-report-polish/spec.md`

## Summary

Исправить мобильную оболочку и основные рабочие экраны без новых backend-сущностей: выделить read-only представление существующей карточки задачи, сделать навигацию и bulk-перенос предсказуемыми, заменить ненадёжную SVG-анимацию сферы на совместимую CSS-анимацию, безопасно разобрать ограниченный Markdown AI-отчёта и хранить последний успешный отчёт в существующем client storage с ключом пользователя/периода. Публичная карточка Forever становится недоступным preview; внутренний Founder и backend не меняются.

## Technical Context

**Language/Version**: React 19 + TypeScript 5.9 frontend; Express ESM JavaScript backend без изменений поведения

**Primary Dependencies**: React Router, Zustand persist, Tailwind CSS, Framer Motion, dnd-kit, Lucide, Axios, Zod, existing Analytics API

**Storage**: существующий browser localStorage для последнего отчёта с owner/period key; существующая PostgreSQL/Prisma-схема без изменений

**Testing**: Vitest + Testing Library, Node test runner backend, Playwright desktop/mobile, ручная проверка физического iOS/Android

**Target Platform**: responsive PWA/web и Telegram Mini App, 320–430 px mobile и desktop

**Project Type**: web application с отдельным Express backend

**Performance Goals**: сфера показывает движение ≤2 с и не вызывает layout thrash; восстановление локального отчёта синхронно при открытии; bulk-операция не создаёт повторных обновлений

**Constraints**: русский UI; LandingPage не менять; Founder backend/БД/entitlements не менять; никаких migrations/env/deploy; отчёт не пересекает аккаунты; безопасный ограниченный Markdown без HTML; offline task queue сохраняется

**Scale/Scope**: 8 frontend touch-points, 1 shared presentation helper/component, 1 owner-scoped report utility, docs и focused tests

## Constitution Check

- **I. Пользовательская ценность и контроль — PASS**: Главная read-only; bulk и новый отчёт требуют явного действия; AI не меняет задачи автоматически.
- **II. Развитие существующей архитектуры — PASS**: переиспользуются Task store/API, AppLayout, Sidebar, Analytics API и auth owner id.
- **III. Защита данных, денег и секретов — PASS**: Founder backend и production не меняются; отчёт owner-scoped; prompt/task text не логируется.
- **IV. Доказательства перед релизом — PASS**: unit/render/e2e и физическое mobile smoke; Landing/Prisma guards обязательны.
- **V. Понятная совместная разработка — PASS**: изменения делятся на shell, dashboard/tasks, pricing, report/docs и тестовые коммиты.

## Project Structure

### Documentation (this feature)

```text
specs/010-mobile-ui-report-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── analytics-report-storage.md
│   └── ui-behavior.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── layout/GlowyAiOrb.tsx
│   ├── layout/Sidebar.tsx
│   ├── mind/MindHubChat.tsx
│   └── tasks/{ReadOnlyTaskCard,TaskControls,TaskList}.tsx
├── pages/{DashboardPage,TaskPage,AnalyticsPage,PricingPage,SettingsPage}.tsx
├── utils/{analyticsReportStorage,safeMarkdown}.ts(x)
└── index.css
docs/{ai-unit-economics,architecture,product-roadmap}.md
e2e/{pricing.smoke,personal-progress.smoke,mobile-ui-polish}.spec.ts
```

**Structure Decision**: frontend-only behavior reuses existing stores and API clients. Shared task-card presentation stays narrow so Dashboard is visually aligned without inheriting mutations. No backend source or schema change.

## Design Decisions

### 1. Сфера без SVG transform ambiguity

Именованный stylesheet keyframe, явные `transform-box`, `transform-origin`, `will-change`; `prefers-reduced-motion` — hard opt-out. Без JavaScript frame loop и device sniffing.

### 2. Read-only карточка как отдельное представление

Переиспользовать presentation helpers/meta, не sortable TaskItem. Так Dashboard конструктивно не получает DnD, checkbox, edit, delete или subtask mutations.

### 3. Bulk move через существующий update path

Каждая выбранная активная задача проходит через `useUpdateTask`, сохраняя offline reconciliation. Сначала собираются success/failure, затем меняется selection и показывается итог.

### 4. Безопасный Markdown subset

Разбирать только paragraphs, headings, ordered/unordered lists и `**bold**` в React text elements. HTML остаётся текстом; `dangerouslySetInnerHTML` и новая dependency не используются.

### 5. Последний успешный отчёт локально

Versioned record под ключом authenticated `userId` и границ периода. Restore только exact match; failed regeneration не перезаписывает старый результат.

### 6. Forever только presentation preview

Убрать query-param/manual Founder activation из PricingPage. Сохранить current-plan lookup и internal `founder` recognition только для статуса действующего пользователя. PaymentApi/backend не меняются.

## Post-Design Constitution Check

PASS. Новых schema/provider/secret/payment mutation и параллельной task/AI архитектуры нет. Локально сохранённый derived text owner-scoped и не логируется.

## Complexity Tracking

No constitution violations require exceptions.

