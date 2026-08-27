# Implementation Plan: Telegram Bot MVP

**Branch**: `codex/v2.8.0-telegram-bot` | **Date**: 2026-08-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-telegram-bot-mvp/spec.md`

## Summary

Добавить Telegram как безопасный дополнительный канал к существующему аккаунту Glowy: привязка
одноразовым кодом из настроек, команды `/start`, `/help`, `/today`, `/energy`, текстовый `/add` с
AI-черновиком и обязательным inline-подтверждением, а также отвязка. Webhook проверяет отдельный
secret, идемпотентно сохраняет минимальное обновление и быстро отвечает; backend worker обрабатывает
его через общий Prisma client и существующие task, energy, AI-provider и AI-limit правила. Голос в
v2.8.0 не распознаётся и не тарифицируется: бот предлагает продублировать мысль текстом; STT
перенесён в v2.8.1.

## Technical Context

**Language/Version**: React 19 + TypeScript 5.9 frontend; Node.js ESM backend (текущий runtime Glowy)

**Primary Dependencies**: Express 5, Prisma 7, PostgreSQL, axios, Zod, Node `crypto`/`fetch`, Telegram Bot API; без нового Telegram SDK и без STT-зависимости

**Storage**: существующая PostgreSQL через `backend/lib/prisma.js`; аддитивные таблицы подключения, кодов, черновиков и очереди webhook

**Testing**: Vitest + Testing Library frontend; Node test runner + Supertest backend; Prisma validation; production build

**Target Platform**: текущие backend-развёртывания Timeweb и Render; frontend Timeweb/Vercel; Telegram HTTPS webhook

**Project Type**: существующее web-приложение с Express API и внешним bot adapter

**Performance Goals**: webhook подтверждается менее чем за 1 секунду после валидации и сохранения; `/today`/`/energy` дают пользовательский ответ до 3 секунд при штатных зависимостях

**Constraints**: только private chat; русские ответы; никаких секретов/текстов в логах; AI только через существующий provider и лимиты; задача только после подтверждения; обновление идемпотентно; voice без STT; без Mini App

**Scale/Scope**: один Telegram на одного пользователя, один backend worker на процесс, текущий пользовательский масштаб Glowy; ограниченные очереди и черновики с очисткой payload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **Контроль пользователя — PASS**: `/add` сохраняет только временный черновик; постоянная задача
  создаётся одной транзакцией после inline-подтверждения владельца.
- **Существующая архитектура — PASS**: adapter работает внутри текущего backend, использует shared
  Prisma, текущие задачи, AI provider и AI limits; отдельной auth, AI, БД или очереди не создаётся.
- **Данные и секреты — PASS**: bot token, webhook-secret и HMAC-secret только в backend env; код
  хранится как HMAC; payload очищается после обработки; логи не содержат сообщения и identifiers.
- **Production safety — PASS WITH RELEASE GATE**: schema/migration создаются локально, но production
  migration, webhook, BotFather и env запрещены до отдельного approval и нового backup Timeweb.
- **Доказательства — PASS**: предусмотрены unit/HTTP/UI проверки, повторная доставка, чужой callback,
  AI-limit и ручной dev-сценарий с тестовым Telegram.
- **Понятность — PASS**: пользовательский текст русский, конфигурация и operations документируются,
  `LandingPage.tsx` не затрагивается.

Post-design review: модель аддитивна и cascade-привязана к `User`; очередь использует ту же БД и
не нарушает запрет параллельного хранилища. Нарушений конституции, требующих исключения, нет.

## Project Structure

### Documentation (this feature)

```text
specs/008-telegram-bot-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── settings-api.md
│   ├── telegram-bot.md
│   └── webhook-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app.js
├── server.js
├── lib/prisma.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/20260826220000_add_telegram_bot/migration.sql
├── routes/
│   ├── telegram.routes.js
│   └── user.routes.js
├── services/
│   ├── ai/note-task-draft.service.js
│   ├── tasks/task-write.service.js
│   └── telegram/
│       ├── telegram-api.client.js
│       ├── telegram-link.service.js
│       ├── telegram-update.service.js
│       └── telegram-worker.service.js
├── scripts/telegram-webhook.js
└── test/
    ├── telegram-routes.test.js
    ├── telegram-link.test.js
    └── telegram-worker.test.js

src/
├── api/UserApi.ts
├── components/settings/
│   ├── TelegramConnectionPanel.tsx
│   └── TelegramConnectionPanel.test.tsx
├── pages/SettingsPage.tsx
└── types/index.ts

docs/
└── telegram-bot-operations.md
```

**Structure Decision**: Telegram остаётся adapter/service внутри существующего Express backend.
Frontend получает только auth-защищённые настройки подключения. Worker запускается из
`backend/server.js`, но конструируется с внедряемыми зависимостями, поэтому HTTP-тесты остаются
без БД и не стартуют фоновые циклы.

## Processing Design

1. `POST /api/telegram/webhook` сравнивает secret-header constant-time, валидирует минимальную
   форму update и создаёт `TelegramWebhookUpdate` по уникальному `updateId`.
2. Повторный `updateId` считается успешно принятым. Endpoint возвращает `200` сразу после
   сохранения и уведомляет локальный worker без ожидания Telegram API или AI.
3. Worker атомарно захватывает pending update. После успешной обработки он очищает `payload`,
   оставляя идентификатор для защиты от повторов. Временный сбой получает ограниченный retry;
   старый payload очищается не позднее 30 минут.
4. Команды проверяют private chat и актуальное `TelegramConnection` при каждом действии. До
   привязки разрешены только `/start`, `/help` и ввод действующего link code.
5. `/add <текст>` или текст после `/add` проверяет AI-limit, создаёт один черновик через текущий
   server-side AI provider, списывает запрос только по существующим правилам и отправляет кнопки.
6. Callback подтверждения в одной DB-транзакции переводит только принадлежащий пользователю
   pending draft и создаёт одну Task через общий task-write helper. Повторный callback безопасен.
7. `/energy` использует фиксированные кнопки 20/40/60/80/100 и тот же clamp 0..100; `/today`
   использует строковый контракт `YYYY-MM-DD`, вычисленный в согласованной московской зоне MVP.

## Release Boundaries

- В ветке создаются код, локальная migration и документация; production БД не меняется.
- BotFather, token, webhook URL, DNS и dev/prod env настраивает пользователь после проверок.
- Скрипт webhook читает значения из env, не печатает token/secret и не запускается автоматически.
- Для production migration потребуется отдельное явное согласие и свежий подтверждённый backup.
- Реальный голосовой STT и Telegram login для сайта не входят в v2.8.0.

## Complexity Tracking

Конституционных нарушений нет. DB-backed очередь добавлена не как параллельная инфраструктура, а
как аддитивные сущности в текущей PostgreSQL, необходимые для быстрого webhook ACK,
идемпотентного подтверждения и восстановления после перезапуска.
