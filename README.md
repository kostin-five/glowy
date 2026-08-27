# Glowy AI

Glowy AI — эмпатичный SaaS-продукт для задач, подзадач, энергии дня, прогресса и AI-Хаба мыслей, который помогает превращать хаос в спокойный план действий.

Идея проекта простая: планирование должно помогать двигаться вперёд, а не добавлять давления. Glowy объединяет task manager, AI-коучинг, энергопотенциал, XP-прогресс, аналитику и базовый billing-контур в одном рабочем пространстве.

## Продукт

Glowy помогает пользователю:

- вести задачи и подзадачи;
- выгружать мысли в Хаб мыслей;
- превращать свободный текст в структурированные задачи;
- получать короткую AI-поддержку, если сообщение не похоже на задачу;
- планировать день с учётом текущей энергии;
- видеть фокус дня, прогресс, XP и аналитику;
- пользоваться AI-лимитами, связанными с тарифом.

## Текущий релиз

Текущий продуктовый релиз: `v2.6.0`.

Ключевые изменения:

- Tasks 2.0: группировка, сортировка, bulk selection и улучшенный mobile UX.
- Единый frontend-контракт дат задач: `YYYY-MM-DD | ""`.
- Mind Hub auto-flow с контекстом активных задач, проверкой дублей, переносом дат и устойчивым AI fallback.
- Dashboard 2.0 с фокусом дня, задачами из Хаба и рекомендациями с учётом энергии.
- Тарифы Start, Focus и бесплатный пожизненный Founder для первых пользователей.
- Focus checkout через ЮKassa.
- Founder доступен первым пользователям бесплатно и бессрочно.
- Профиль хранит подготовленный аватар, стиль общения Glowy и добровольное
  участие в beta-функциях Focus.
- «Мой прогресс» объединяет уровни, стрик задач, спасательные круги, привычки и
  достижения; оценка и фактическое время задачи остаются необязательными.
- Аналитика недели/месяца рассчитывается backend по завершённым задачам; глубокий
  AI-разбор доступен только Focus/Founder и запускается пользователем вручную.
- Задачи и подзадачи доступны без интернета: изменения сохраняются на устройстве
  и автоматически синхронизируются после восстановления соединения.

## Технологии

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, IndexedDB.
- Backend: Node.js, Express, Prisma, PostgreSQL.
- Auth: HttpOnly cookie session и восстановление сессии через `/auth/me`.
- AI: прямой DeepSeek с GigaChat fallback; временный proxy mode остаётся только для отката.
- Payments: YooKassa checkout и webhook для тарифа Focus.
- Process manager: PM2.
- Deploy: Vercel frontend, VPS/Timeweb backend, Timeweb PostgreSQL.

## Структура репозитория

```text
.
├── src/                         # React frontend
│   ├── api/                     # API-клиенты
│   ├── components/              # UI и feature-компоненты
│   ├── pages/                   # Страницы приложения
│   └── store/                   # Zustand stores
├── backend/                     # Express backend
│   ├── routes/                  # API routes
│   ├── services/ai/             # AI provider, Mind Hub, limits
│   ├── prisma/                  # Prisma schema и migrations
│   └── server.js
├── ai-proxy/                    # Опциональный AI proxy service
├── docs/                        # Release notes и operational docs
└── deploy/                      # VPS/Nginx deployment notes
```

## Тарифы и AI-лимиты

| Тариф | Цена | AI-лимит | Описание |
| --- | ---: | ---: | --- |
| Demo | Бесплатно | 3/день | Гостевой демо-доступ |
| Start | Бесплатно | 10/день | Базовый тариф зарегистрированного пользователя |
| Focus | 99 ₽/месяц | 100/день | Платный тариф через ЮKassa, действует 30 дней |
| Founder | Бесплатно | 100/день | Пожизненный доступ первых пользователей |

Focus активируется после успешного webhook от ЮKassa.

Founder доступен первым пользователям бесплатно и бессрочно. Для совместимости значение тарифа хранится в базе как `forever`, но во внешнем API и интерфейсе отображается как Founder.

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

Создать env-файлы:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Запустить backend:

```bash
cd backend
npm run start
```

Запустить frontend:

```bash
npm run dev
```

Полезные проверки:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

## База данных и Prisma

Prisma migrations находятся в `backend/prisma/migrations`.

Для новой пустой базы:

```bash
cd backend
npm run migrate:deploy
```

Правила для production:

- не запускать `prisma migrate reset`;
- не использовать `prisma db push` для починки live-базы;
- перед migration operations делать backup базы в Timeweb;
- использовать `prisma migrate resolve --applied <migration>` только для миграций, которые уже фактически отражены в реальной схеме.

Миграция `20260816110000_add_personal_progress_analytics` только добавляет поля
профиля/задач и таблицы прогресса/AI-агрегатов. Её нужно сначала проверить на
dev-базе, а в Timeweb применять только после свежего backup и отдельного
подтверждения владельца. Подготовка файла в репозитории не означает, что
миграция уже применена.

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

Founder:

1. Старое внутреннее значение `forever` остаётся в базе без миграции, но бесплатный пожизненный доступ отображается как Founder.
2. Авторизованный пользователь активирует Founder через совместимый endpoint `POST /api/payments/forever/activate`.
3. Founder бессрочный, не создаёт платёж и получает лимит 100 AI-запросов в день.

## Документация

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
