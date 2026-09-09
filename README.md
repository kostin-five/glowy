# Glowy AI

Glowy AI — эмпатичный SaaS-продукт для задач, подзадач, энергии дня, прогресса и AI-ассистента, который помогает превращать хаос в спокойный план действий.

> Активная продуктовая разработка заморожена 2026-09-09. Репозиторий сохраняется как
> рабочий production-продукт и инженерный case study. Новая feature-разработка не планируется;
> допускаются только maintenance, безопасность и инфраструктурная оптимизация.

Идея проекта простая: планирование должно помогать двигаться вперёд, а не добавлять давления. Glowy объединяет task manager, AI-коучинг, энергопотенциал, XP-прогресс, аналитику и базовый billing-контур в одном рабочем пространстве.

## Продукт

Glowy помогает пользователю:

- вести задачи и подзадачи;
- выгружать мысли в Ассистент и получать редактируемый черновик;
- превращать свободный текст в структурированные задачи;
- получать короткую AI-поддержку, если сообщение не похоже на задачу;
- планировать день с учётом текущей энергии;
- видеть фокус дня, прогресс, XP и аналитику;
- пользоваться AI-лимитами, связанными с тарифом.

## Текущий релиз

Кандидат на финальный maintenance-релиз — `v2.11.0`. До завершения release gate,
merge и production smoke последним подтверждённым production остаётся `v2.8.0` на
commit `97af6f6`. Фактическое состояние релиза фиксируется в handoff-документах.

Ключевые изменения:

- Tasks 2.0: группировка, сортировка, bulk selection и улучшенный mobile UX.
- Единый frontend-контракт дат задач: `YYYY-MM-DD | ""`.
- Mind Hub auto-flow с контекстом активных задач, проверкой дублей, переносом дат и устойчивым AI fallback.
- Dashboard 2.0 с фокусом дня, задачами из Хаба и рекомендациями с учётом энергии.
- Тарифы Start, Focus и пожизненный Forever для ранее подключённых пользователей.
- Focus checkout через ЮKassa.
- Существующий Forever остаётся активным бессрочно; новое оформление пока недоступно.
- Профиль хранит подготовленный аватар, режим поведения Glowy и добровольное
  участие в beta-функциях Focus.
- «Мой прогресс» объединяет уровни, месячную «Карту ритма», спасение только
  вчерашнего разрыва, привычки и достижения; плановая длительность видна в
  карточке, а оценка и фактическое время остаются необязательными.
- Аналитика недели/месяца рассчитывается backend по завершённым задачам; глубокий
  AI-разбор доступен только Focus/Forever и запускается пользователем вручную.
- Задачи и подзадачи доступны без интернета: изменения сохраняются на устройстве
  и автоматически синхронизируются после восстановления соединения.

## Технологии

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, IndexedDB.
- Backend: Node.js, Express, Prisma, PostgreSQL.
- Auth: HttpOnly cookie session и восстановление сессии через `/auth/me`.
- AI: прямой DeepSeek с GigaChat fallback; временный proxy mode остаётся только для отката.
- Payments: YooKassa checkout и webhook для тарифа Focus.
- Process manager: PM2.
- Deploy: production frontend/backend на Timeweb, production PostgreSQL на Timeweb; dev frontend
  на Vercel, dev backend на Render и отдельная dev PostgreSQL на Neon.

## Структура репозитория

```text
.
├── src/                         # React frontend
│   ├── api/                     # API-клиенты
│   ├── components/              # UI и feature-компоненты
│   ├── pages/                   # Страницы приложения
│   └── store/                   # Zustand stores
├── backend/                     # strict ESM TypeScript backend
│   ├── routes/                  # API routes
│   ├── services/ai/             # AI provider, Mind Hub, limits
│   ├── lib/prisma.ts            # единственный Prisma client source
│   ├── prisma/                  # Prisma schema и migrations
│   └── dist/                    # локальный generated artifact, не хранится в git
├── packages/contracts/          # Общие Zod request/response/error contracts
├── ai-proxy/                    # Опциональный AI proxy service
├── docs/                        # Release notes и operational docs
└── deploy/                      # VPS/Nginx deployment notes
```

## Тарифы и AI-лимиты

| Тариф | Цена | AI-лимит | Описание |
| --- | ---: | ---: | --- |
| Demo | Бесплатно | Без живых AI-запросов | Безопасное знакомство до регистрации |
| Start | Бесплатно | 10/день | Базовый тариф зарегистрированного пользователя |
| Focus | 99 ₽/месяц | 70/день | Платный тариф через ЮKassa, действует 30 дней |
| Forever | Пока недоступен | 70/день | Пожизненный доступ; новое оформление ещё не открыто |

Focus активируется после успешного webhook от ЮKassa.

Существующие пользователи Forever сохраняют бессрочный доступ. Публичная бесплатная активация закрыта, а новое оформление пока недоступно.

## Переменные окружения

### Frontend

```env
VITE_API_URL=https://api.glowy-ai.ru/api
VITE_PAYMENTS_ENABLED=true
VITE_YANDEX_METRIKA_ID=
VITE_TELEGRAM_BOT_USERNAME=
```

### Backend

```env
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGINS=https://glowy-ai.ru,https://www.glowy-ai.ru,https://dev.glowy-ai.ru,http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173

YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=https://glowy-ai.ru/payment/success
YOOKASSA_CANCEL_URL=https://glowy-ai.ru/payment/cancel

AI_PROVIDER_MODE=direct
AI_PROVIDER_TIMEOUT_MS=30000
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
GIGACHAT_AUTH_KEY=...
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat-2-Max
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_BASE_URL=https://api.giga.chat

AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD=
AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_INPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_OUTPUT_PER_MILLION_USD=

PAID_FOREVER_ENABLED=false
FOREVER_PRICE_RUB=

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=glowy_bot
TELEGRAM_WEBHOOK_URL=https://api.example.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_LINK_CODE_SECRET=...
TELEGRAM_MINI_APP_URL=https://example.com/telegram
TELEGRAM_MINI_APP_INIT_MAX_AGE_SECONDS=300
TELEGRAM_MINI_APP_SESSION_HOURS=24
TELEGRAM_WORKER_ENABLED=false
```

Telegram token и оба secret существуют только на backend. Mini App проверяет подписанный запуск
не старше пяти минут, а связанная Telegram-сессия действует не более 24 часов. Для локальной
разработки worker оставляют выключенным; порядок безопасной dev-активации описан в
`docs/telegram-bot-operations.md`.

Временный rollback через AI proxy:

```env
AI_PROVIDER_MODE=proxy
AI_PROXY_URL=https://...
AI_PROXY_SECRET=...
```

## Локальная разработка

Установить зависимости:

```bash
npm install
cd backend
npm install
```

Создать только backend env из публичного шаблона и заполнить dev-значениями:

```bash
cp backend/.env.example backend/.env
```

Корневой `.env` для обычного локального запуска не нужен; AI keys никогда не задаются как Vite
variables.

Запустить backend в watch-режиме:

```bash
cd backend
npm run serve
```

Запустить frontend:

```bash
npm run dev
```

Полезные проверки:

```bash
npm run contracts:build
npm run contracts:test
npm run typecheck
npm run lint
npm run build
npm test

cd backend
npm run typecheck
npm run test
```

Начиная с локально завершённой v2.10.0 основной backend — strict ESM TypeScript. `npm run build`
создаёт `backend/dist/`, `npm start` запускает `dist/server.js`, а source-импорты NodeNext сохраняют
`.js` suffix для будущего emitted artifact. Единственный Prisma client создаётся в
`backend/lib/prisma.ts`. Общий пакет `packages/contracts` валидирует критические auth, tasks, AI и
payment boundaries; фактические endpoints и consumers зафиксированы в
`specs/012-contracts-observability/contracts/endpoint-inventory.md`. Отдельный `ai-proxy/` не
является обычным runtime-путём и сохраняется только как rollback-компонент.

## База данных и Prisma

Prisma migrations находятся в `backend/prisma/migrations`.

Только для новой пустой dev/test базы после review migration history:

```bash
cd backend
npm run migrate:deploy
```

Правила для production:

- не запускать `prisma migrate reset`;
- не использовать `prisma db push` для починки live-базы;
- перед migration operations делать backup базы в Timeweb;
- использовать `prisma migrate resolve --applied <migration>` только для миграций, которые уже фактически отражены в реальной схеме.

Production Timeweb содержит реальные данные и имеет собственную подтверждённую историю применений.
Подготовка migration в репозитории не означает её применение. Перед любой новой production
migration нужны review SQL, свежий backup Timeweb и отдельное разрешение владельца.

## Deploy

Frontend деплоится через Timeweb.

Backend деплоится на VPS/Timeweb через PM2:

```bash
cd /var/www/glowy
deploy-glowy
```

Если менялись переменные окружения:

```bash
pm2 restart glowy-backend --update-env
```

Проверка backend:

```bash
curl https://api.glowy-ai.ru/api/health
pm2 logs glowy-backend --lines 50
```

## Payments

Focus payment flow:

1. Frontend вызывает `POST /api/payments/focus/create`.
2. Backend создаёт платёж в ЮKassa.
3. Пользователь переходит по confirmation URL.
4. ЮKassa вызывает `POST /api/payments/yookassa/webhook`.
5. Backend повторно проверяет платёж через ЮKassa API.
6. Backend активирует `focus` на 30 дней.

Forever:

1. Значение `forever` остаётся в базе без миграции и отображается как Forever.
2. Старый endpoint `POST /api/payments/forever/activate` больше не выдаёт тариф и возвращает контролируемый отказ.
3. Уже назначенный Forever бессрочный и получает лимит 70 AI-запросов в день; новое оформление пока закрыто.

## Документация

- [Latest local handoff](docs/handoffs/PROJECT_HANDOFF_2026-09-09.md)
- [Last verified production handoff](docs/handoffs/PROJECT_HANDOFF_2026-08-30.md)
- [Developer onboarding](docs/handoffs/DEVELOPER_ONBOARDING.md)
- [Canonical next-chat prompt](docs/handoffs/NEXT_CHAT_PROMPT.md)
- [Architecture](docs/architecture.md)
- [Product roadmap](docs/product-roadmap.md)
- [Kodik review notes](docs/README_KODIK_REVIEW.md)
- [v2.0.0 release notes](docs/releases/v2.0.0-product-release.md)
- [v2.2.1 release notes](docs/releases/v2.2.1-ai-providers-and-founder.md)
- [v2.3.0 release notes](docs/releases/v2.3.0-profile-and-personalization.md)
- [v2.4.0 release notes](docs/releases/v2.4.0-personal-progress.md)
- [v2.5.0 release notes](docs/releases/v2.5.0-analytics-and-focus.md)
- [v2.6.0 release notes](docs/releases/v2.6.0-offline-mode.md)
- [AI unit economics](docs/ai-unit-economics.md)
- [Payments live checklist](docs/payments-live-checklist.md)
- [VPS deploy notes](deploy/README.md)

## Лицензия

См. [LICENSE](LICENSE).
