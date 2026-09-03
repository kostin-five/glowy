# Tasks: Независимый от Telegram запуск сайта

## Phase 1: Setup

- [X] T001 Зафиксировать loader/gate UI contract в `specs/019-nonblocking-telegram-sdk/contracts/sdk-startup-contract.md`
- [X] T002 Зафиксировать automated/manual проверки и rollback в `specs/019-nonblocking-telegram-sdk/quickstart.md`

## Phase 2: Foundational

- [X] T003 [P] Добавить unit-сценарии detection, shared attempt, timeout, error/retry и storage failure в `src/telegram/telegramSdkLoader.test.ts`
- [X] T004 [P] Добавить browser-сценарии нулевых web-запросов, delayed SDK, error/retry и reload в `e2e/telegram-sdk-startup.spec.ts`
- [X] T005 [P] Добавить regression позднего session restore после unmount в `src/components/telegram/TelegramMiniAppBootstrap.test.tsx`

## Phase 3: User Story 1 — Обычный сайт работает независимо (P1)

**Goal**: обычные страницы не запрашивают и не ждут Telegram SDK.

**Independent Test**: заблокировать SDK и открыть обычные страницы; UI работает, request count равен нулю.

- [X] T006 [US1] Реализовать route/launch/marker detection без чтения payload в `src/telegram/telegramSdkLoader.ts`
- [X] T007 [US1] Удалить глобальное подключение Telegram SDK из `index.html`
- [X] T008 [US1] Переместить Telegram provider внутрь router для SPA route detection в `src/App.tsx`

## Phase 4: User Story 2 — Управляемое ожидание Mini App (P1)

**Goal**: SDK загружается один раз, имеет 10-секундный предел и явный retry.

**Independent Test**: задержать, отклонить и затем разрешить SDK; проверить loading/error/retry и отсутствие раннего auth.

- [X] T009 [US2] Реализовать shared lazy SDK loader с validation, timeout, cleanup и retry в `src/telegram/telegramSdkLoader.ts`
- [X] T010 [US2] Добавить route-aware gate с русскими loading/error состояниями и текущим знаком Glowy в `src/telegram/TelegramMiniAppProvider.tsx`
- [X] T011 [US2] Обновить controlled ordinary-browser Mini App fixture для lazy SDK в `e2e/telegram-mini-app.spec.ts`

## Phase 5: User Story 3 — Сохранение текущих сценариев (P2)

**Goal**: reload, theme/safe-area, safe target, registration/logout и отмена restore остаются безопасными.

**Independent Test**: reload целевого route с marker и поздний resolve после ухода не меняют auth/route.

- [X] T012 [US3] Записывать только tab-context marker после валидного launch и безопасно переживать storage denial в `src/telegram/telegramSdkLoader.ts`
- [X] T013 [US3] Игнорировать поздний успешный backend restore после abort в `src/components/telegram/TelegramMiniAppBootstrap.tsx`
- [X] T014 [US3] Проверить существующие target, registration, logout и mobile-width сценарии в `e2e/telegram-mini-app.spec.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 Выполнить typecheck, lint, unit tests, build, focused и полный Playwright suite по `specs/019-nonblocking-telegram-sdk/quickstart.md`
- [X] T016 Зафиксировать результат, риски ручной Telegram-приёмки и rollback в `docs/product-roadmap.md`

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish.
- T003–T005 независимы по файлам и выполняются до production-кода.
- US2 зависит от route-aware основания US1; US3 расширяет готовый loader/provider без нового auth flow.

## Parallel Opportunities

- T003, T004 и T005 можно готовить параллельно до реализации.
- После loader implementation T011 и T013 независимы по файлам.

## Implementation Strategy

MVP: US1 + US2 — web полностью независим, Mini App имеет конечное loading/error/retry состояние.
Затем US3 закрывает reload и late-result regressions. Весь slice остаётся одним обратимым commit без
schema/env/production операций.
