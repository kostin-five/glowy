# Dependency audit — baseline 2026-09-04, upgrade 2026-09-05

## Baseline перед security upgrade

Аудит повторён 2026-09-05 командой `npm audit --omit=dev --json` отдельно для каждого npm
install root. Это снимок registry advisories, а не доказательство эксплуатации конкретного flow.

| Install root | Findings | Severity | Основные dependency paths |
| --- | ---: | --- | --- |
| `/` | 10 | 8 high, 1 moderate, 1 low | `axios → form-data`; `react-router-dom → react-router`; `vite → postcss → nanoid`; `express-rate-limit → express → body-parser/qs`; `express-rate-limit → ip-address` |
| `backend/` | 12 | 7 high, 4 moderate, 1 low | `express → body-parser/qs`; `express-rate-limit → ip-address`; `prisma → @prisma/config → deepmerge-ts`; `prisma → @prisma/dev → @hono/node-server/hono/valibot`; `prisma → mysql2` |
| `ai-proxy/` | 1 | 1 moderate | `express → qs` |

Backend audit включает дерево direct devDependency `prisma` даже с `--omit=dev`. Эти findings
нельзя автоматически считать production runtime: Prisma CLI используется для generate/build и не
импортируется собранным `backend/dist/server.js`. Но они остаются в отчёте до проверки обновлённого
дерева и не скрываются из итогов.

## Проверенные целевые линии

CI использует Node 22; локальная проверка выполнена на Node 22.22.2. Цели выбраны в стабильных
совместимых линиях и выше верхней границы соответствующих advisories.

| Владелец дерева | Было | Целевая версия | Причина |
| --- | ---: | ---: | --- |
| `axios` | 1.16.1 | 1.20.0 | Axios advisories исправлены начиная с 1.18.0; текущая версия поддерживает Node 22. |
| `react-router-dom` / `react-router` | 7.14.2 | 7.18.3 | Закрывает диапазоны до 7.18.1; требует Node >=20. |
| `vite` | 8.0.10 | 8.2.2 | Закрывает диапазон до 8.0.15; требует Node ^20.19 или >=22.12. |
| `express-rate-limit` | 8.5.2 | 8.7.0 | Даёт актуальный диапазон `ip-address`; поддерживает Node >=16. |
| Prisma packages | 7.8.0 | 7.10.0 stable | Согласованная 7.x линия для CLI, client и adapter; поддерживает Node 22.12+. |

Ожидаемые исправленные транзитивы: `form-data` >=4.0.6, `body-parser` >=2.3.0,
`ip-address` >10.3.0, `nanoid` >=3.3.18, `postcss` >8.5.22 и `qs` >=6.16.0. Они должны
разрешаться через прямых владельцев и lockfile. `overrides` допускаются только если обычное
обновление дерева не может выбрать исправленную совместимую версию.

Prisma registry на момент проверки помечает 8.0.0 как release candidate, а npm audit предлагает
downgrade до 6.19.3. Оба варианта исключены: security change не выполняет major migration или
downgrade. После обновления 7.x остаточные CLI findings классифицируются отдельно.

## Результат после обновления

Все три lockfile пересобраны и проверены clean install. Полный `npm audit --json`, включая dev
tooling, повторён 2026-09-05:

| Install root | До | После | Результат |
| --- | ---: | ---: | --- |
| `/` | 10 production findings | 0 | Axios 1.20.0, React Router 7.18.3, Vite 8.2.2 и `express-rate-limit` 8.7.0; разрешены исправленные runtime- и dev-транзитивы. |
| `backend/` | 12 production-report findings | 0 | Prisma client/adapter/CLI 7.10.0, `express-rate-limit` 8.7.0 и исправленные Express-транзитивы; полный audit также 0. |
| `ai-proxy/` | 1 production finding | 0 | Express 5.2.1 разрешает `body-parser` 2.3.0 и `qs` 6.16.0. |

Корневой tooling дополнительно разрешил исправленные `@babel/core`, `brace-expansion`,
`browserslist` и `fast-uri` в пределах диапазонов их владельцев. Backend использует два узких
override: `deepmerge-ts@8.0.2` вместо закреплённого Prisma 7.10.0 значения 7.1.5 и
`mysql2@3.24.3` вместо 3.15.3. Они закрывают Prisma CLI advisories без downgrade на Prisma 6 или
перехода на release candidate 8 и проверены через clean `npm ci`, `prisma validate`,
`prisma generate`, TypeScript build и 170/170 backend tests.

Overrides нужно удалить, когда стабильная Prisma-линия начнёт сама разрешать `deepmerge-ts` >=8.0.0
и `mysql2` >=3.24.3; при каждом обновлении Prisma повторять generate, audit и backend suite.
Остаточных audit findings на дату проверки нет.

Проверки изменения: contracts 14/14, targeted frontend 21/21, полный frontend 235/235,
backend 170/170, Playwright 143 passed/1 conditional skip, frontend/backend typecheck, Vite
production/PWA build и локальные health-smoke backend/AI proxy прошли. Frontend lint по-прежнему имеет одну существовавшую до change ошибку
`react-hooks/set-state-in-effect` в `src/personalization/useAppWallpaper.ts:24`; она не связана с
dependency upgrade и остаётся отдельным узким change.

## Правило принятия решения

`npm audit` используется как сигнал для анализа, а не команда автоматического исправления.
`npm audit fix --force`, Prisma downgrade и необоснованные overrides запрещены. Для каждого
остаточного finding итог должен указать advisory, dependency path, runtime relevance, причину
отсутствия совместимого исправления и условие повторной проверки.
