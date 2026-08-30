# Implementation Plan: Telegram Mini App

**Branch**: `codex/v2.8.0-telegram-bot` | **Date**: 2026-08-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-telegram-mini-app/spec.md`

## Summary

Переделать v2.8.0 в полноценный Telegram Mini App: кнопка «Открыть Glowy» запускает существующее
React-приложение внутри Telegram, новый пользователь регистрирует обычный аккаунт Glowy прямо там,
существующий входит там же, а проверенный Telegram автоматически связывается с `User`. Повторный
запуск выдаёт ограниченную Telegram-сессию после серверной проверки `initData`; удаление связи
немедленно делает такую сессию недействительной. Основные защищённые экраны переиспользуются без
второго frontend/API/AI/data flow. Бот остаётся DB-backed webhook worker, но получает полное меню,
навигацию по Mini App, безопасные чтения и подтверждаемые быстрые действия.

## Technical Context

**Language/Version**: React 19 + TypeScript 5.9 frontend; Node.js ESM backend

**Primary Dependencies**: React Router, Zustand, axios, Express 5, Prisma 7, PostgreSQL,
существующая validation, Node `crypto`/`fetch`, официальный Telegram Mini Apps bridge и Bot API;
без второго frontend и без нового Telegram framework

**Storage**: существующая PostgreSQL через `backend/lib/prisma.js`; существующие `User`, `Task`,
`Note`, progress, subscription/AI usage и аддитивные Telegram-таблицы v2.8.0

**Testing**: Vitest + Testing Library; Node test runner + Supertest; Prisma validation; production
build/PWA; ручная проверка в Telegram dev-клиенте

**Target Platform**: Telegram mobile/desktop webview; обычные mobile/desktop browsers; текущий
Vercel/Render dev и Timeweb production после отдельного согласования

**Project Type**: существующее React SPA + Express API с Telegram transport adapter

**Performance Goals**: bootstrap показывает осмысленное состояние сразу; проверенная Mini App
сессия готова не позднее 3 секунд при штатном backend; webhook ACK менее 1 секунды; обычные команды
до 3 секунд без AI и с контролируемым ожиданием для AI

**Constraints**: русский UI; `initDataUnsafe` не является доказательством; auth, ownership,
тарифы, AI-лимиты и изменения проверяются backend; AI не мутирует данные; секреты и тексты не
логируются; `LandingPage.tsx` не меняется; платежи/восстановление/чувствительная безопасность
открываются снаружи; production без действий до approval и backup

**Scale/Scope**: полное авторизованное приложение внутри Telegram; один `User` и максимум одна
активная Telegram-связь; private bot chat; один существующий DB worker; без voice STT в v2.8.0

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **Контроль пользователя — PASS**: бот показывает черновики и подтверждения; Mini App использует
  текущие UI-flow, где AI-предложение сохраняется только явным действием.
- **Существующая архитектура — PASS**: `/telegram` — bootstrap поверх того же SPA; channel endpoints
  вызывают общий auth/session layer; все данные идут через действующие API, shared Prisma, AI и
  payment rules. Telegram connection не является отдельным пользователем.
- **Данные и секреты — PASS**: backend валидирует raw `initData`, `auth_date`, hash и связь; token,
  init data, пароли, callback payload и пользовательский текст не логируются. Telegram JWT имеет
  ограниченный срок и проверяемую связь.
- **Production safety — PASS WITH RELEASE GATE**: реализация, тесты и конфигурационные примеры
  локальны. BotFather, menu/Main Mini App, env, webhook, deploy и production остаются отдельным
  согласованным этапом; production schema не меняется автоматически.
- **Доказательства — PASS**: предусмотрены unit/HTTP/UI тесты проверки init data, конфликтов связи,
  отзыва сессии, навигации, команд, повторных callback и real-device dev checklist.
- **Понятность — PASS**: публичные состояния русские, contracts/operations обновляются,
  `LandingPage.tsx` не затрагивается.

Post-design review: решение расширяет текущие auth middleware и Telegram adapter, но не создаёт
параллельную сессию, базу или API сущностей. Новая migration для редизайна не ожидается: модели
первого v2.8.0 достаточны. Если реализация выявит необходимость schema change, работа останавливается
до обновления плана и отдельного согласования dev/prod migration.

## Project Structure

### Documentation (this feature)

```text
specs/008-telegram-mini-app/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mini-app-api.md
│   ├── mini-app-client.md
│   ├── settings-api.md
│   ├── telegram-bot.md
│   └── webhook-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── api/{AuthApi.ts,TelegramMiniAppApi.ts}
├── components/telegram/TelegramMiniAppBootstrap.tsx
├── telegram/{TelegramMiniAppProvider.tsx,telegramMiniAppBridge.ts,telegramMiniAppRoutes.ts,telegramMiniAppSession.ts}
├── layout/AppLayout.tsx
└── pages/{LoginPage,RegisterPage,PricingPage}.tsx

backend/
├── app.js
├── middleware/auth.middleware.js
├── routes/{auth.routes.js,telegram.routes.js}
├── services/
│   ├── auth/auth-session.service.js
│   ├── tasks/task-completion.service.js
│   └── telegram/{telegram-mini-app-auth.service.js,telegram-api.client.js,
│       telegram-link.service.js,telegram-worker.service.js}
├── scripts/telegram-webhook.js
└── test/telegram-*.test.js
```

**Structure Decision**: Mini App не получает отдельное дерево экранов. Route `/telegram` только
проверяет среду, создаёт/восстанавливает Telegram-bound auth session и переводит в allowlisted
существующий route. Provider адаптирует viewport/theme/back/external-link поведение. Backend
Telegram routes являются channel adapter и вызывают общий auth/domain code.

## Authentication and Session Design

1. Frontend получает raw `window.Telegram.WebApp.initData`, никогда не доверяет
   `initDataUnsafe` для доступа и не сохраняет init data в localStorage/logs.
2. `POST /api/telegram/mini-app/session` проверяет Telegram HMAC, обязательные поля и возраст
   `auth_date` не более 5 минут. Если связь существует, backend выдаёт обычную HttpOnly cookie с channel
   claims и возвращает тот же безопасный user DTO, что auth API.
3. Для несвязанного Telegram bootstrap показывает вход/регистрацию внутри Mini App. Channel
   login/register используют общие credential validation, password hashing и user creation rules,
   а connection создают/проверяют в транзакции. Существующий email не дублируется.
4. Telegram session JWT содержит channel и connection id и живёт не более 24 часов.
   `authMiddleware` для такого token проверяет активную связь; `/unlink` немедленно отзывает
   доступ. Обычные web sessions сохраняют текущий контракт.
5. Конфликт «Telegram уже связан с другим User» или «User связан с другим Telegram» никогда не
   разрешается молча: пользователь получает безопасное русское объяснение и должен сначала
   отозвать старую связь.

## Mini App Client Design

1. `/telegram` вызывает `ready()`/`expand()`, применяет Telegram theme и safe-area CSS variables,
   поддерживает native back/close и показывает русские bootstrap/error/retry states.
2. После входа используются существующие `/dashboard`, `/tasks`, `/notes`, `/ai`, `/stairs`,
   `/analytics`, `/settings` и один Zustand/API state. Target из bot button/start parameter проходит
   строгий allowlist и не становится произвольным redirect.
3. `AppLayout`, header/bottom navigation и fullscreen AI получают минимальные Telegram-aware
   адаптации, сохраняя обычный web/PWA вид. Горизонтальный overflow и Telegram safe areas
   проверяются на 320/360/390/430 px.
4. Оплата, восстановление пароля и отдельные security/legal flows вызывают Telegram `openLink`
   либо обычный внешний переход вне Mini App; URL формируется только из разрешённых Glowy/provider
   адресов и только по пользовательскому клику.
5. Открытие `/telegram` вне Telegram не создаёт сессию и показывает кнопку возврата к боту;
   отсутствие bridge/init data никогда не даёт белый экран.
6. Credential-flow Mini App переиспользует обычные страницы входа и регистрации, переключая только
   channel API по наличию проверяемого Telegram launch context. Локальный флаг logout не содержит
   идентификаторов или auth-данных: он лишь блокирует автоматический restore до успешного ручного
   входа и не удаляет серверную `TelegramConnection`.

## Bot Processing Design

1. `/start`, `/help`, `/app` и неизвестная команда показывают «Открыть Glowy» и компактное русское
   меню. Persistent menu/Main Mini App настраиваются тем же allowlisted `TELEGRAM_MINI_APP_URL`.
2. Web App кнопки ведут на bootstrap с target для главной, задач, заметок, AI, прогресса,
   аналитики и настроек. Данные в URL не содержат user id, token или link code.
3. Быстрые чтения: `/today`, `/tasks`, `/energy`, `/progress`. Быстрые изменения: `/add`, `/done`,
   `/energy`; AI-вопрос: `/ai`. Pending state ограничен по времени и имеет «Отменить»/Mini App.
4. `/add` сохраняет только существующий `TelegramTaskDraft`; `/done` повторно проверяет владельца и
   завершает Task через общий completion service только после confirm; выбор энергии является
   явной кнопкой и выполняет idempotent set. `/ai` использует текущий provider/limit и не сохраняет
   сущности.
5. Webhook queue, update-id replay guard, callback ownership, retry и очистка payload остаются.
   Callback data остаётся ограниченным, а сообщения и init data не попадают в логи.

## Release Boundaries

- Код и тесты выполняются в feature branch; существующую migration v2.8.0 не переигрываем и
  production DB не трогаем.
- Новые public env names: `TELEGRAM_MINI_APP_URL` и ограничение возраста init data; token/secrets
  остаются backend-only. Frontend не получает bot token.
- BotFather Main Mini App/menu/domain, webhook и dev env включаются только после green checks.
- Один bot можно перевести dev → production только контролируемым cutover: отключить dev worker,
  заменить URL/webhook, повернуть оба ранее отмеченных секрета и проверить production после approval.
- Voice/STT, Telegram payments и push/attachment-menu расширения не входят в v2.8.0.

## Complexity Tracking

Конституционных исключений нет. Telegram-bound claim и дополнительная DB-проверка нужны для
немедленного отзыва доступа; channel endpoints нужны для серверной проверки `initData` до выдачи
той же Glowy-сессии. Это адаптация существующего auth, а не параллельная архитектура.
