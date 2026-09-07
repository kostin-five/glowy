## 1. Semantic token foundation

- [x] 1.1 Добавить отдельный CSS token layer с ограниченным semantic catalog для canvas/surface/text/border, primary/accent/status, typography, spacing, radii, elevation/glow, focus, motion и touch targets; проверить, что light/dark значения применяются через существующий class-based theme contract.
- [x] 1.2 Добавить Tailwind 4 bridge для публичных semantic ролей без изменения существующих product components; проверить production build и отсутствие изменений API, backend, данных или `LandingPage.tsx`.
- [x] 1.3 Добавить machine-readable token catalog и русскоязычную документацию назначения ролей, допустимых pairing и пути постепенной миграции; проверить тестом, что catalog и опубликованные CSS semantic properties согласованы.

## 2. Accessibility foundation

- [x] 2.1 Добавить unit test контраста token pairings: не ниже 4.5:1 для обычного текста и 3:1 для крупных текстов, интерактивных границ и focus-индикаторов; проверить целевым Vitest test.
- [x] 2.2 Реализовать foundation states для видимого keyboard focus, `prefers-reduced-motion` и 44 × 44 CSS px touch target; проверить component/browser тестами Tab focus, reduced motion и computed target size.

## 3. Local visual baseline

- [x] 3.1 Добавить deterministic read-only foundation showcase route без ссылок из Sidebar, Header, BottomNav и пользовательских deeplink-подсказок; проверить, что route не требует auth, не выполняет API-запросы и отображает token states.
- [x] 3.2 Добавить Playwright visual snapshots showcase для desktop и mobile viewport в light и dark темах, сохранить baseline в репозитории; проверить focused Playwright run без backend, secrets и cloud visual service.
- [x] 3.3 Документировать локальные команды обновления/проверки screenshot baseline и правило review для намеренных визуальных изменений; проверить команды в чистом локальном окружении.

## 4. Regression gate и handoff

- [x] 4.1 Выполнить focused smoke существующих light/dark/system и mobile layout flows, подтвердив отсутствие массовой миграции экранов; проверить обновлёнными target tests и ручной проверкой representative routes.
- [x] 4.2 Выполнить frontend typecheck, lint, полный Vitest suite, production/PWA build и focused visual Playwright; зафиксировать результаты, размер diff, отсутствие production/env/data изменений и rollback в handoff.
