# Release Checklist

## Перед merge в `dev`

1. Запустить в корне `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` и
   `npm run test:e2e`.
2. Если менялись shared API boundaries, выполнить `npm run contracts:build` и
   `npm run contracts:test`.
3. Если менялся backend, выполнить `cd backend && npm run typecheck && npm run test` и убедиться,
   что inventory не допускает возврат runtime JavaScript в основной backend.
4. Выполнить `git diff --check`; проверить, что в diff нет `.env`, токенов, пользовательских
   данных, миграций без согласования и несвязанных файлов.
5. Убедиться, что CI pull request прошёл полностью.
6. Не запускать `prisma db push`, `prisma migrate reset` или production migration без отдельного
   согласования и Timeweb backup.

## После dev-deploy

1. Открыть dev-сайт в обычном desktop-браузере и на ширине 360, 390 и 430 px.
2. Проверить `/api/health`: ответ должен содержать `status: ok` и заголовок `X-Request-Id`.
3. Пройти один безопасный ручной сценарий: регистрация/вход тестового пользователя, создание и
   изменение задачи, один AI-запрос в пределах лимита. Не использовать реальный платёж для smoke.
4. Если включена аналитика: принять cookies, проверить в Debugger Метрики только разрешённые
   события; затем отказаться от cookies и убедиться, что продукт продолжает работать без событий.
5. Если проверяется оплата, использовать отдельный безопасный сценарий YooKassa и сверить webhook
   в логах по `X-Request-Id`, не публикуя идентификаторы платежей.

## Dependency audit

`npm audit` -- это сигнал для исследования, а не команда для автоматического исправления. Перед
обновлением зависимостей нужно проверить затронутый пакет, совместимость, changelog и пройти
релевантные тесты. Не использовать `npm audit fix --force` в рабочей ветке без отдельного решения.

Для Glowy проверять все независимые install roots: `/`, `backend/` и `ai-proxy/`. После изменения
manifest или lockfile выполнить clean `npm ci` и полный `npm audit --json` в затронутом root.
При обновлении Prisma дополнительно выполнить `prisma validate`, `prisma generate`, backend
typecheck/tests и проверить необходимость overrides `deepmerge-ts`/`mysql2`; удалить overrides,
когда стабильная Prisma-линия начнёт разрешать безопасные версии самостоятельно.
