## Context

См. `proposal.md` — Why. Репозиторий содержит три независимых npm install root: основной frontend/tooling, `backend/` и rollback-компонент `ai-proxy/`. На 2026-09-05 корневой audit показывает 10 findings, backend — 12, AI proxy — 1. CI использует Node 22 и выполняет `npm ci` отдельно в корне и backend; AI proxy не входит в основной CI.

Корневые прямые уязвимые версии — `axios@1.16.1`, `react-router-dom@7.14.2`, `vite@8.0.10`; `express-rate-limit@8.5.2` владеет уязвимым `ip-address`. Безопасные доступные линии совместимы с текущим Node 22: Axios не ниже 1.18.0, React Router не ниже 7.18.2 и Vite выше 8.0.15. Express 5.2.1 остаётся актуальной прямой версией, но его диапазоны допускают новые `body-parser` и `qs` после обновления lockfile.

Backend-отчёт требует отдельной трактовки: часть findings относится к dev-only Prisma CLI tree (`@prisma/dev`, Hono, Valibot, MySQL driver), хотя команда запущена с `--omit=dev`. npm предлагает major downgrade Prisma 7.x → 6.19.3; это несовместимо с текущей архитектурой и не является приемлемым автоматическим исправлением. Доступная стабильная линия Prisma 7.10.0 всё ещё закрепляет часть отмеченных транзитивов, а registry помечает 8.0.0 только как release candidate.

## Goals / Non-Goals

**Goals:**

- Устранить каждый finding, для которого существует совместимое исправление в поддерживаемой стабильной линии.
- Сохранить воспроизводимый `npm ci` для всех трёх install roots и совместимость с Node 22/CI.
- Отделить реальный production runtime-риск от dev-tool findings и документировать любой остаток с dependency path и причиной.
- Доказать отсутствие регрессий в routing, API/auth, offline/PWA, frontend build и backend HTTP flows.

**Non-Goals:**

- Major migration библиотек или замена React, Router, Express, Prisma либо Vite.
- Обновление всех зависимостей до newest без связи с audit findings.
- Изменение публичного поведения, схемы данных или deployment environment.

## Decisions

### 1. Обновлять по прямому владельцу и минимальной безопасной стабильной линии

Для корня обновить manifest constraints Axios, React Router и Vite как минимум за верхнюю границу advisories; `react-router-dom` должен разрешить ту же версию `react-router`. `express-rate-limit` обновить до стабильной версии, которая разрешает исправленный `ip-address`. Затем пересобрать только соответствующий lockfile обычным `npm install`, проверить `npm ls` и audit.

Для Express-транзитивов сначала переустановить дерево с текущим Express 5.2.1: его semver ranges допускают исправленные `body-parser` и `qs`. Аналогично Vite должен сам привести исправленные PostCSS/Nanoid через актуальное дерево. Прямая зависимость на транзитив или `overrides` добавляется только если владелец ещё не выпускает совместимый resolution.

Альтернатива — `npm audit fix` или массовый upgrade всех пакетов. Она отклонена: итог зависит от эвристики npm, смешивает несвязанный churn и для Prisma предлагает downgrade major-линии.

### 2. Обрабатывать install roots последовательно и независимо

Порядок: корень → backend → AI proxy. После каждого блока проверяются diff manifest/lockfile, `npm ci` в чистом временном каталоге или эквивалентная lockfile-проверка, dependency paths и соответствующие тесты. Это локализует источник регрессии и позволяет откатить один блок без возврата уже безопасного другого.

Альтернатива — один общий `npm install` из корня. Она невозможна: проект не настроен как npm workspace, и у каждого сервиса собственный lockfile.

### 3. Prisma сохраняет согласованную стабильную major-линию

`prisma`, `@prisma/client` и `@prisma/adapter-pg` обновляются только согласованным набором стабильной 7.x линии и проходят generate/typecheck/backend tests. Release candidate 8.x, downgrade на 6.x и индивидуальная подмена внутренних Prisma packages запрещены в этом change.

Если актуальная стабильная 7.x не устраняет dev-tool findings, они записываются как residual risk с доказательством, что path принадлежит CLI/build tooling и не загружается `backend/dist/server.js` в production. Допустим узкий override только для транзитива, если его совместимость подтверждена lockfile, `prisma generate`, build и полным backend test suite; внутренние `@prisma/*` overrides не используются.

Альтернатива — принять npm-рекомендацию Prisma 6.19.3. Она отклонена из-за major downgrade, возможной несовместимости schema/client/adapter и отсутствия продуктовой причины откатывать уже принятую Prisma 7 архитектуру.

### 4. Audit является входом для анализа, а не единственным acceptance gate

Цель — ноль устранимых production findings. Каждый оставшийся finding должен иметь severity, advisory, полный dependency path, runtime/dev классификацию, причину отсутствия безопасного исправления и условие повторной проверки. `npm audit` не заменяет тесты, потому что безопасная версия пакета может изменить поведение маршрутизации, HTTP-клиента или сборщика.

### 5. Проверять поведение на существующем полном gate

Корень: contracts tests, typecheck, targeted routing/API/offline tests, полный Vitest, lint, production build и Playwright smoke. Backend: Prisma generate, inventory, typecheck и database-free HTTP/service tests. AI proxy: clean install, syntax/startup smoke без внешних ключей там, где это возможно. Известная до change lint-ошибка `src/personalization/useAppWallpaper.ts:24` не исправляется попутно и отдельно отражается в результате, если всё ещё воспроизводится.

## Risks / Trade-offs

- [Patch/minor обновление Router или Axios меняет edge behavior] → пройти существующие auth/navigation/API tests и ручной smoke основных защищённых маршрутов.
- [Обновление Vite/PostCSS влияет на PWA или production bundle] → выполнить production build, Playwright и проверить manifest/service-worker outputs.
- [Override создаёт скрытую несовместимость] → предпочитать обновление прямого владельца, документировать каждый override и добавить критерий его удаления.
- [Audit продолжает считать dev-only Prisma tree production] → подтвердить dependency path и runtime imports, не маскировать результат и записать residual risk.
- [Три lockfile увеличивают diff] → менять и проверять их отдельными последовательными блоками без форматирования или unrelated dependency refresh.
- [Registry/advisories изменятся во время реализации] → повторить audit перед первым изменением и после финального clean install; в документации указывать дату снимка.

## Migration Plan

1. Снять свежий audit/dependency-tree baseline для каждого install root и определить точные целевые стабильные версии.
2. Обновить корневые прямые владельцы advisories и lockfile, затем пройти root verification.
3. Обновить backend compatible runtime/transitive tree; Prisma менять только согласованной стабильной 7.x тройкой, затем выполнить generate и полный backend gate.
4. Обновить lockfile AI proxy и выполнить install/startup smoke.
5. Повторить audits, классифицировать остаток и обновить audit/handoff документацию.
6. Production deployment выполняется позже владельцем по release checklist и не входит в change.

Rollback: revert сфокусированного dependency commit возвращает manifests, lockfiles и только связанные compatibility-правки. Поскольку schema и данные не меняются, database rollback не требуется; после отката повторяются `npm ci`, build и соответствующий smoke.
