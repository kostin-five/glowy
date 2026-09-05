## Why

Актуальный `npm audit --omit=dev` на 2026-09-05 обнаруживает 10 package findings в корневом дереве, 12 в backend и 1 в rollback-компоненте `ai-proxy`; среди них есть high-severity advisories в прямых и транзитивных зависимостях. Перед дальнейшим развитием v3.0.0 нужно обновить уязвимые пакеты контролируемо, сохранив существующие frontend-, backend- и rollback-сценарии и не полагаясь на потенциально несовместимый автоматический `npm audit fix`.

## What Changes

- Повторно зафиксировать baseline audit для корня, `backend/` и `ai-proxy/`, связать каждый finding с прямым владельцем dependency tree и безопасной версией.
- Обновить прямые зависимости и lockfile минимальными совместимыми версиями, которые закрывают advisories; ожидаемые корневые кандидаты включают Axios, React Router, Vite и `express-rate-limit`.
- Обновить разрешаемые транзитивные зависимости через их прямых владельцев или lockfile resolution; использовать `overrides` только при доказанной необходимости и с объяснением удаления override в будущем.
- Отдельно обработать Prisma CLI findings: не выполнять предложенный npm downgrade Prisma 7.x → 6.x; обновлять Prisma согласованной парой `prisma`/`@prisma/client`/adapter только после проверки официальной совместимости, иначе документировать неприменимость или временно неустранимый tooling-риск.
- Прогнать полный frontend, contracts и backend gate, routing/auth/API/offline smoke и production-like запуск собранного backend без production deploy.
- Обновить dependency-audit и handoff/release документацию фактическим остаточным риском.

### Non-goals

- Не менять React/Express архитектуру, публичные API, продуктовые сценарии, UI или дизайн-систему.
- Не добавлять TanStack Query и не выполнять функциональный рефакторинг одновременно с security upgrade.
- Не менять Prisma schema, миграции, данные, env, внешние сервисы или production.
- Не добиваться формального нуля findings через major downgrade, `npm audit fix --force` или необоснованные overrides.

## Capabilities

### New Capabilities

Нет. Это dependency/tooling change без нового пользовательского поведения.

### Modified Capabilities

Нет. Канонические требования приложения остаются прежними; change использует `skip_specs: true`.

## Impact

- Затрагиваются `package.json`/`package-lock.json`, `backend/package.json`/`backend/package-lock.json`, `ai-proxy/package.json`/`ai-proxy/package-lock.json` только там, где это необходимо для устранения подтверждённых advisories.
- Возможны совместимые корректировки тестовой или build-конфигурации, если обновлённый пакет требует их; изменение runtime-кода допускается только для сохранения уже существующего поведения.
- Данные и PostgreSQL не затрагиваются; миграции не нужны. Production deploy и restart не входят в change.
- Rollback выполняется возвратом dependency manifest/lockfile и связанных совместимых правок одним сфокусированным revert; отдельного отката данных нет.
