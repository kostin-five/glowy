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

Текущий продуктовый трек: `v2.0.0`.

Ключевые изменения:

- Tasks 2.0: группировка, сортировка, bulk selection и улучшенный mobile UX.
- Единый frontend-контракт дат задач: `YYYY-MM-DD | ""`.
- Mind Hub auto-flow с контекстом активных задач, проверкой дублей, переносом дат и устойчивым AI fallback.
- Dashboard 2.0 с фокусом дня, задачами из Хаба и рекомендациями с учётом энергии.
- Тарифы Start, Focus и Forever.
- Focus checkout через ЮKassa.
- Бесплатная активация Forever для первых пользователей.

## Технологии

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand.
- Backend: Node.js, Express, Prisma, PostgreSQL.
- Auth: HttpOnly cookie session и восстановление сессии через `/auth/me`.
- AI: прямой Gemini provider или AI proxy mode.
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
| Forever | Бесплатный промо | 100/день | Постоянный доступ для первых пользователей |

Focus активируется после успешного webhook от ЮKassa.

Forever активируется без оплаты через backend endpoint для авторизованного пользователя и не имеет срока окончания.

## Переменные окружения

### Frontend

```env
VITE_API_URL=https://api.glowy-ai.ru/api
VITE_PAYMENTS_ENABLED=true
VITE_YANDEX_METRIKA_ID=
```

### Backend

```env
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGINS=https://glowy-ai.ru,https://www.glowy-ai.ru,https://dev.glowy-ai.ru,http://localhost:5173,http://localhost:4173

YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=https://glowy-ai.ru/payment/success
YOOKASSA_CANCEL_URL=https://glowy-ai.ru/payment/cancel

AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

Если используется AI proxy вместо прямого Gemini:

```env
AI_PROVIDER=proxy
AI_PROXY_URL=https://...
AI_PROXY_SECRET=...
AI_PROXY_TIMEOUT_MS=120000
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

Forever activation:

1. Гость нажимает Forever и попадает на login/register с сохранённым pricing intent.
2. Авторизованный пользователь вызывает `POST /api/payments/forever/activate`.
3. Backend устанавливает `plan = "forever"`, `subscriptionStatus = "active"`, `planExpiresAt = null`.

## Документация

- [Kodik review notes](docs/README_KODIK_REVIEW.md)
- [v2.0.0 release notes](docs/releases/v2.0.0-product-release.md)
- [Payments live checklist](docs/payments-live-checklist.md)
- [VPS deploy notes](deploy/README.md)

## Лицензия

См. [LICENSE](LICENSE).
