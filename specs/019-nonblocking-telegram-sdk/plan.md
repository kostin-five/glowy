# Implementation Plan: Независимый от Telegram запуск сайта

**Branch**: `codex/nonblocking-telegram-sdk` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

## Summary

Удалить блокирующее глобальное подключение Telegram Web App SDK из `index.html` и загружать
существующий официальный SDK только при входе в Telegram-контекст. Новый загрузчик разделяет одну
активную попытку, ограничивает ожидание 10 секундами и допускает явный повтор. Провайдер остаётся
единственной frontend-точкой Telegram-контекста, а существующий backend продолжает проверять
`initData` и создавать сессию.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, браузерный ESM
**Primary Dependencies**: React Router 7, Axios, Vitest, Testing Library, Playwright, Vite PWA
**Storage**: один нечувствительный `sessionStorage`-маркер факта Mini App-вкладки; БД и схемы не меняются
**Testing**: Vitest + Testing Library; Playwright desktop/mobile; frontend typecheck/lint/build
**Target Platform**: современные desktop/mobile браузеры и Telegram Mini App WebView 320–430 px
**Project Type**: React SPA с существующим Express backend
**Performance Goals**: ноль Telegram SDK-запросов на обычных web-страницах; результат не позднее 10 секунд
**Constraints**: не менять backend-auth, не хранить `initData`, не трогать LandingPage, production/env/БД
**Scale/Scope**: один SDK-загрузчик, Telegram provider/gate, bootstrap guard и изолированные тесты

## Constitution Check

### Before design

- **I. User-Controlled AI**: pass — AI и данные пользователя не затрагиваются.
- **II. Backend Authority**: pass — URL/маркер выбирают только загрузку SDK; личность подтверждает
  существующий `/telegram/mini-app/session`.
- **III. Privacy & Security**: pass — `initData` не копируется и не логируется; тесты синтетические.
- **IV. Data Integrity**: pass — БД, Prisma и пользовательские данные не меняются.
- **V. Small Verifiable Changes**: pass — узкий frontend-срез с unit/e2e проверками и rollback.
- **VI. Calm Russian UX**: pass — видимые состояния и повтор русские, знак Glowy сохраняется.

### After design

Pass без исключений. Решение переиспользует bridge, provider, bootstrap и server session flow,
не вводит параллельный auth и не требует миграций или production-действий.

## Project Structure

### Documentation (this feature)

```text
specs/019-nonblocking-telegram-sdk/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
index.html
src/
├── App.tsx
├── components/telegram/
│   ├── TelegramMiniAppBootstrap.tsx
│   └── TelegramMiniAppBootstrap.test.tsx
└── telegram/
    ├── TelegramMiniAppProvider.tsx
    ├── telegramMiniAppBridge.ts
    ├── telegramSdkLoader.ts
    └── telegramSdkLoader.test.ts
e2e/
├── telegram-mini-app.spec.ts
└── telegram-sdk-startup.spec.ts
docs/product-roadmap.md
```

**Structure Decision**: frontend-only change in the established Telegram integration. The loader
is beside the existing bridge; provider owns route-aware preparation and UI gating; bootstrap
remains responsible only for backend session restoration.

## Design Phases

1. Add failing unit and browser scenarios for ordinary web independence, delayed/error/timeout
   loading, retry, shared attempts and abandoned session restoration.
2. Implement loader and route/tab-context detection without inspecting or persisting launch values.
3. Gate Telegram-dependent rendering inside `BrowserRouter`, preserve provider lifecycle, and
   remove the global script tag.
4. Run focused tests, full frontend gates and full Playwright suite; record behavior and rollback.

## Rollback

Revert the focused feature commit. No database, environment or external-service rollback is needed.

## Complexity Tracking

No constitution violations or additional architectural layers are required.
