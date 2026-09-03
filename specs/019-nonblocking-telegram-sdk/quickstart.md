# Quickstart: проверка независимого старта

## Automated

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test e2e/telegram-sdk-startup.spec.ts e2e/telegram-mini-app.spec.ts --reporter=line
npm run test:e2e -- --reporter=line
```

## Manual web check

1. Заблокировать `https://telegram.org/js/telegram-web-app.js*` в DevTools.
2. Открыть landing, login, register и авторизованный route: UI работает, SDK request отсутствует.
3. Перейти на `/telegram`: увидеть подготовку, затем не позднее 10 секунд ошибку и `Повторить`.
4. Разблокировать URL и нажать `Повторить`: без reload получить контролируемый Mini App сценарий.

## Manual Telegram acceptance

На dev открыть Main Mini App, пройти session restore, перейти на задачи, перезагрузить WebView и
проверить safe target, тему/safe area, явный выход и повторный запуск. Реальные `initData` и
пользовательские тексты не копировать в отчёт или логи.

## Rollback

Revert одного feature commit; миграций, env и очистки пользовательских данных нет.
