## 1. Tooling and shared boundary

- [x] 1.1 Проверить peer compatibility stable Storybook React/Vite, a11y addon и выбранных Radix packages с lockfile React 19/Vite 8/TypeScript 6; добавить только нужные зависимости, scripts и ignored local catalog artifact, проверить `npm install`, audit relevant root и отсутствие несвязанного dependency churn.
- [x] 1.2 Создать `.storybook` React/Vite configuration, импортирующий существующий token/global CSS entry и изолированный light/dark/mobile decorator без `App`, stores, API или service worker; проверить local catalog startup без `/api/` requests и успешный static build.
- [x] 1.3 Добавить маленькие shared helpers/types для semantic token-only class composition и form associations в отдельном primitive namespace; проверить type test или focused component tests без изменения legacy imports.

## 2. Core Glowy primitives

- [x] 2.1 Реализовать Button и IconButton с documented variants/sizes, disabled/loading handling, minimum touch target и обязательным accessible name для icon-only action; проверить keyboard focus, disabled action и light/dark component tests.
- [x] 2.2 Реализовать Input, Textarea, Label и Field с нативными props, устойчивой связью label/description/error и readable validation states; проверить accessible name/description/error и отсутствие raw palette classes в новых components.
- [x] 2.3 Реализовать Card, Badge, Skeleton, EmptyState и Alert поверх semantic token roles, включая calm empty/loading/success/warning/error states без product data mutation; проверить component tests и deterministic stories в обеих темах.
- [x] 2.4 Реализовать scoped Toast provider/component API без глобальной product store или миграции существующих notices; проверить semantic live region, dismiss/focus behavior и отсутствие API/data side effects.

## 3. Overlay and selection primitives

- [x] 3.1 Реализовать controlled Dialog и Sheet на едином Radix-based layer с portal, title/description, Escape close, focus return, safe-area и mobile viewport boundaries; проверить keyboard/browser cases и отсутствие изменений legacy Headless UI consumers.
- [x] 3.2 Реализовать Popover, Select, Tabs и Tooltip с documented controlled callbacks, keyboard navigation, selected state и accessible labels; проверить focused interaction tests для Enter/Space/arrows/Escape и light/dark rendering.

## 4. Component catalog and tests

- [x] 4.1 Добавить co-located stories для каждого primitive: light/dark, compact mobile viewport и применимые default, disabled, loading, empty, error, destructive и keyboard-focus states; проверить stories через local catalog без auth/data bootstrap.
- [x] 4.2 Настроить local accessibility/interaction проверку stories и Playwright smoke isolated overlay/mobile viewport; проверить, что basic violations, focus return, reduced motion и 44 px touch target покрыты без cloud service.
- [x] 4.3 Добавить unit/component regression tests для public primitive APIs и выполнить existing light/dark/system plus mobile product smoke, подтвердив отсутствие массовой миграции routes.

## 5. Documentation, verification and handoff

- [x] 5.1 Документировать public primitive catalog, adoption boundary, Storybook run/build/test commands, visual review и static-output policy; проверить команды в чистом local environment.
- [x] 5.2 Выполнить `typecheck`, `lint`, полный Vitest suite, production/PWA build, Storybook static build, focused Playwright/catalog checks и strict OpenSpec validation; зафиксировать результаты и известные risks.
- [x] 5.3 Обновить handoff с dependency impact, размером diff, отсутствием production/env/data changes и rollback; проверить `git diff --check` и отдельный scope diff до commit.
