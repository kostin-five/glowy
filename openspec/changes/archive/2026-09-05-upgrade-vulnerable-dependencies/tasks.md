## 1. Baseline и целевые версии

- [x] 1.1 Повторить `npm audit --omit=dev --json` и `npm ls` в корне, `backend/` и `ai-proxy/`, сохранить дату, counts и dependency paths в `docs/dependency-audit-2026-09-04.md` и сверить, что baseline объясняет каждый текущий finding.
- [x] 1.2 Проверить stable dist-tags, advisory fixed ranges и Node engines для каждого прямого владельца, составить таблицу current → target → reason и подтвердить, что targets совместимы с Node 22 и не требуют major downgrade.

## 2. Корневой frontend/tooling dependency tree

- [x] 2.1 Обновить manifest constraints и lockfile для Axios, React Router DOM, Vite и `express-rate-limit` до проверенных безопасных стабильных версий; проверить `npm ls axios react-router-dom react-router vite express-rate-limit` и отсутствие неожиданных major-линий.
- [x] 2.2 Разрешить корневые `form-data`, `body-parser`, `ip-address`, `nanoid`, `postcss` и `qs` через обновлённых прямых владельцев/lockfile; если без override невозможно, документировать точный override и подтвердить его результат через `npm explain <package>` и повторный audit.
- [x] 2.3 Проверить воспроизводимость корневого lockfile командой `npm ci` в изолированной чистой копии manifest/lockfile и убедиться, что рабочее дерево не получило несвязанных dependency updates.
- [x] 2.4 Прогнать `npm run contracts:test`, `npm run typecheck`, целевые routing/API/offline тесты, `npm run test`, `npm run lint` и `npm run build`; зафиксировать результаты и отдельно отметить, если воспроизводится только известная pre-existing lint-ошибка wallpaper effect.

## 3. Backend и AI proxy dependency trees

- [x] 3.1 Обновить backend runtime tree (`express-rate-limit`, допускаемые Express-транзитивы и lockfile) без замены Express; проверить исправленные версии `body-parser`, `ip-address` и `qs` через `npm ls`/`npm explain` и backend audit.
- [x] 3.2 Обновить `prisma`, `@prisma/client` и `@prisma/adapter-pg` только согласованным стабильным набором 7.x либо оставить текущую пару при отсутствии безопасной stable-линии; проверить `npx prisma generate`, отсутствие schema diff и согласованность версий.
- [x] 3.3 Для оставшихся Prisma CLI findings доказать dependency paths и runtime/dev классификацию; применить узкий не-`@prisma/*` override только если он проходит `npm ci`, generate, build и tests, иначе записать residual risk без downgrade на Prisma 6 и без release candidate 8.
- [x] 3.4 Прогнать в `backend/` `npm run inventory:check`, `npm run typecheck` и `npm run test`, затем запустить production-like smoke собранного `dist/server.js` без production credentials и проверить health/контролируемое завершение.
- [x] 3.5 Обновить `ai-proxy/package-lock.json` до исправленного разрешения `qs` через поддерживаемый Express range, проверить `npm ci`, `npm ls qs` и локальный syntax/startup smoke без отправки внешнего AI-запроса.

## 4. Финальная проверка и документация

- [x] 4.1 Повторить audits всех трёх install roots и обновить dependency audit таблицей before/after; для каждого остаточного finding указать severity, advisory, path, runtime relevance, причину и условие повторной проверки.
- [x] 4.2 Прогнать полный repository gate, включая Playwright smoke, проверить PWA manifest/service-worker build outputs и подтвердить, что auth, routing, API и offline сценарии сохранили существующее поведение.
- [x] 4.3 Обновить актуальный handoff/release checklist только фактическими версиями, проверками и residual risks; подтвердить, что документы не утверждают production deploy и не требуют database rollback.
- [x] 4.4 Выполнить `npm exec -- openspec validate --all --strict`, `git diff --check` и итоговый scope review; убедиться, что diff не содержит TanStack Query, архитектурного рефакторинга, Prisma schema/migrations, env, landing page или production-конфигурации.
