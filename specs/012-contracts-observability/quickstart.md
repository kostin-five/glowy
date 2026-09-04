# Quickstart validation: v2.9.0

## Preconditions

- Использовать только local/dev окружение и тестовые данные.
- Не читать `.env` и не выводить credentials, tokens, connection strings, initData или тексты
  пользователей.
- Не запускать Prisma migration/reset/push/deploy и не менять production services.

## Install and static checks

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build

cd backend
npm install
npm run typecheck
npm run test
```

Ожидается: contracts package собирается до consumers; frontend и backend checks зелёные.

## Contract inventory

1. Сопоставить mounts из `backend/app.js` с [endpoint-inventory.md](contracts/endpoint-inventory.md).
2. Для каждого route подтвердить auth boundary, request/success/error и consumer.
3. Проверить, что route/client без записи в inventory отсутствует.

## AI authentication contract

- Неавторизованный `POST /api/ai/mind-hub` возвращает 401 и не вызывает provider.
- `POST /api/ai/mind-hub/public` отсутствует/возвращает 404 и не вызывает provider.
- Устаревшая browser demo-session не отправляет network AI request и показывает регистрацию.
- Авторизованный Mind Hub сохраняет текущие drafts/reply/limit поля.

## Atomic quota

- Тестовый user имеет `remaining=1`.
- Запустить 20 одновременных reservations одинаковой стоимости.
- Ровно один результат allowed; остальные denied; итоговый remaining равен 0.
- Смоделировать provider failure и подтвердить один безопасный release в том же окне.
- Повторить через Mind Hub, analytics insight, note task draft и Telegram worker adapters.

## Logging/redaction

- Передать контрольные значения в password, Authorization, email, initData, task title, note
  content, AI message/history и provider payload.
- Вызвать validation, expected provider и unhandled errors.
- Каждая ошибка имеет request ID; ни одно контрольное значение не встречается в captured logs.
- Completion log содержит route template, status и duration, но не body/query/header values.

## Provider resilience

- Primary timeout использует остаток общего 30-second budget; fallback не начинает новый полный
  budget.
- Три retryable failures открывают circuit; последующие requests сразу получают fallback.
- После 30 секунд разрешён один probe; успех закрывает circuit.

## Slice gates and rollback

После каждого slice запускать его backend contract/API tests, весь backend test suite, frontend
typecheck/lint/tests/build и существующие auth/tasks e2e. Rollback — revert конкретного slice;
schema/data rollback не нужен. Production deploy, PM2 restart и log inspection выполняются
только после отдельного разрешения владельца.

Foundation не меняет runtime entrypoint: local/dev/prod backend продолжает запускать
`backend/server.js`. Если shared package или backend typecheck блокирует rollout, откатить только
`packages/contracts`, file-dependencies/scripts, `backend/tsconfig.json` и CI steps; database и
пользовательские данные при этом не затрагиваются.

## Local evidence — 2026-08-31

- Contracts build/tests: **13/13 passed**.
- Backend TypeScript-foundation command: **passed**; это проверяет NodeNext-конфигурацию и
  TypeScript artifacts, но при `checkJs: false` не является строгой типизацией существующих
  backend `.js`. Full database-free HTTP/unit suite: **164/164 passed**.
- Frontend typecheck and lint: **passed**; unit suite: **143/143 passed**; production build:
  **passed**.
- Dashboard/Mind Hub focused suite: **10/10 passed**; desktop/mobile order and explicit task
  confirmation remain covered.
- Full Playwright suite: **105 passed, 1 expected skip, 0 failed** across desktop Chromium and
  mobile Chromium. Shared auth fixtures include the full `SafeUser` contract; the Telegram
  registration-required fixture keeps `/auth/me` unauthenticated and checks the current Russian
  registration heading.
- Endpoint inventory test confirms all **52** active operations; the retired public Mind Hub path
  is not counted and returns 404 before provider work.
- Audit confirms one `PrismaClient` in `backend/lib/prisma.js`; changed routes/services import
  that instance. Redaction tests cover request bodies, credentials, email, initData, task/note/AI
  text and provider payload. `src/pages/LandingPage.tsx`, Prisma schema/migrations, env files and
  production/deploy configuration are absent from the diff.
- No database, provider, payment, Telegram, Render, Vercel, Timeweb, Cloudflare or BotFather
  operation was executed.

There are no remaining local verification gaps. Production and credentialed dev checks remain
outside this code-only evidence and still require separate owner approval.
