# Implementation Plan: Мобильный Glowy AI

**Branch**: `feature/mobile-glowy-ai` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-mobile-glowy-ai/spec.md`

## Summary

Заменить текущую мобильную нижнюю навигацию на согласованный порядок с приподнятой центральной
SVG-кнопкой Glowy AI. Кнопка открывает доступный модальный bottom sheet с компактным вариантом
существующей «Разгрузки мыслей» и ссылкой на новый защищённый маршрут `/ai`. Полная страница и
быстрый лист переиспользуют один frontend store текущего разговора и существующий `AiApi` /
`useTaskStore.createTask`; backend, база, AI-лимиты и task contract не меняются.

## Technical Context

**Language/Version**: TypeScript 6, React 19

**Primary Dependencies**: React Router, Zustand, Headless UI Dialog/Transition, Lucide, Tailwind
CSS, существующий `AiApi` и Mind Hub flow

**Storage**: Существующий browser-local разговор; незавершённые черновики остаются frontend-only.
PostgreSQL и Prisma schema не меняются

**Testing**: Vitest + Testing Library; существующий Playwright smoke и ручная mobile-проверка

**Target Platform**: Современные mobile web/PWA браузеры на 360/390/430 px; desktop без регрессий

**Project Type**: React web application с существующим Express API

**Performance Goals**: Bottom sheet открывается без сетевого запроса и визуально реагирует в
пределах одного кадра; SVG-анимация не вызывает layout shift; используется один AI-запрос на
сообщение

**Constraints**: Русские тексты; никакой автоматической записи задач; никаких новых backend,
database, auth или AI-flow; reduced motion; safe-area; `LandingPage.tsx` не менять

**Scale/Scope**: Mobile bottom navigation, две modal surfaces, один новый route/page, варианты
существующего chat component, общий frontend conversation state и целевые UI-тесты

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Пользовательская ценность и контроль — PASS**: быстрый и полный интерфейсы сохраняют
  `reply → draft → explicit confirm`; центральная кнопка сама не меняет данные.
- **Развитие существующей архитектуры — PASS**: переиспользуются `AppLayout`, `BottomNav`,
  `MindHubChat`, `AiApi`, Zustand и существующий Task API; параллельного AI/backend нет.
- **Защита данных, денег и секретов — PASS**: provider keys и лимиты остаются на backend; в
  аналитике и логах нет текстов; схема базы не меняется.
- **Доказательства перед релизом — PASS**: предусмотрены component/navigation tests, typecheck,
  lint, unit, build и manual viewport checks 360/390/430 px.
- **Понятная совместная разработка — PASS**: русские accessible labels, узкие компоненты и
  обновление архитектурной документации.
- **Landing/production gate — PASS**: Landing, production env, deploy и база вне изменений.

## Project Structure

### Documentation (this feature)

```text
specs/003-mobile-glowy-ai/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mobile-ai-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── BottomNav.test.tsx
│   │   ├── GlowyAiOrb.tsx
│   │   ├── MobileAiSheet.tsx
│   │   └── MobileMoreSheet.tsx
│   └── mind/
│       ├── MindHubChat.tsx
│       └── MindHubChat.test.tsx
├── layout/
│   └── AppLayout.tsx
├── pages/
│   └── GlowyAiPage.tsx
└── store/
    ├── useMindHubStore.ts
    └── useMindHubStore.test.ts

docs/
├── architecture.md
└── product-roadmap.md
```

**Structure Decision**: Сохранить текущий layout/router. `BottomNav` владеет взаимоисключающим
состоянием мобильных панелей. Headless UI обеспечивает modal semantics, focus trap, Escape и
backdrop close. `MindHubChat` получает визуальный variant, но вся отправка и подтверждение остаются
в одном компоненте. Небольшой persisted Zustand store синхронизирует сообщения и ожидающие
черновики между быстрым листом и страницей `/ai`, мигрируя текущую browser-local историю.

## Complexity Tracking

Нарушений конституции, требующих оправдания, нет.

## Design Decisions

1. Mobile breakpoint остаётся `lg`, совпадая с существующим переключением Sidebar/BottomNav.
2. Центральная кнопка открывает sheet на любом защищённом mobile route. Полный чат открывается
   отдельной кнопкой внутри sheet, а не первым нажатием на orb.
3. Для focus trap, Escape, backdrop и возврата фокуса используется существующий Headless UI.
4. Одновременно может быть открыт только AI sheet или «Ещё»; смена route закрывает обе панели.
5. `/ai` использует `ProtectedLayoutRoute` и тот же `MindHubChat`, поэтому auth, AI limits и
   подтверждение задач не дублируются.
6. Текущий разговор и frontend-only drafts переносятся в один persisted store. Серверная история,
   синхронизация между устройствами и несколько чатов не добавляются.
7. SVG orb реализуется как code-native component с CSS-анимацией и `motion-reduce`, без внешнего
   изображения и без изменения Landing Page.
8. На mobile embedded chat Dashboard не монтируется; на desktop он остаётся на прежнем месте.
9. «Мой прогресс» ведёт на `/stairs`; «Ещё» показывает `/analytics` и `/settings`.
