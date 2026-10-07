# Gate демонстрационного релиза

1. Проверить env examples и отсутствие secrets/PII в текущих файлах и истории.
2. Проверить типы, lint, contracts, frontend/backend tests, production builds и Playwright.
3. Проверить зависимости; отдельно указать runtime и dev-tool advisories.
4. Применять миграции только после согласования новой целевой базы; не восстанавливать данные без backup.
5. Локальные проверки: auth, logout/replay, ownership, задачи, offline, AI quota, Telegram.
   Внешний smoke без тестовых данных: health, guest, отказ регистрации и checkout.
   Непроверенные живые account flows указать отдельно; seed не запускать.
6. Проверить CSP, cookies и холодный старт на фактическом hosting.
7. Проверить GitHub artifacts, issues/PR, releases и attachments вручную.
8. Перед rewrite истории создать Git backup; force push и Make public требуют отдельного разрешения.
9. При переиспользовании Render dev сначала выключить Auto-Deploy, затем проверить
   новую базу, готовый `master`, команды сборки и backend окружение. После разрешённого
   ручного deployment выполнить smoke; только затем включать After CI Checks Pass.
10. Проверить блокирующую CSP и отсутствие Метрики даже со старым cookie consent.
