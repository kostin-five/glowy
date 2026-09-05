## 1. Dependency и измеримый baseline

- [x] 1.1 Зафиксировать текущую стабильную React 19-compatible версию `@tanstack/react-query`, добавить только её в runtime dependencies и обновить lockfile; проверить `npm install`, `npm ls @tanstack/react-query` и `npm audit --omit=dev`.
- [x] 1.2 Зафиксировать baseline ручной server-state orchestration в `SuccessStairsPage` и production bundle до миграции; проверить, что методика подсчёта описана в итоговом handoff и может быть повторена после изменения.

## 2. Общая Query-основа

- [x] 2.1 Реализовать фабрику `QueryClient` и production singleton с согласованными stale/gc/focus/retry defaults; проверить unit-тестами один retry для временной query-ошибки, отсутствие retry для `4xx` и отсутствие автоматического retry mutation.
- [x] 2.2 Подключить `QueryClientProvider` в корневой frontend composition без изменения маршрутизации, Telegram bootstrap или landing page; проверить component smoke рендера приложения и `npm run typecheck`.
- [x] 2.3 Реализовать типизированный account query-key root и session lifecycle, который отменяет и удаляет queries предыдущего пользователя; проверить unit/component-тестом logout и смену `userId` во время незавершённого запроса.

## 3. Progress queries и сетевое прерывание

- [x] 3.1 Добавить необязательный `AbortSignal` в `ProgressApi.getOverview` и передать его Axios без изменения HTTP-контракта; проверить API unit-тестом signal forwarding и сохранение Zod-валидации ответа.
- [x] 3.2 Реализовать progress query keys/options по `userId`, `today` и `month`, отключая запрос для гостя или отсутствующего пользователя; проверить unit-тестами различие ключей и отсутствие API-вызова вне authenticated account.
- [x] 3.3 Реализовать hook загрузки overview с кэшированием свежего результата, background refetch и явным retry; проверить hook/component-тестами повторное открытие свежего месяца, переключение месяца, поздний ответ и восстановление после ошибки.

## 4. Согласованные progress mutations

- [x] 4.1 Перевести create/rename/archive/restore/delete/check привычки на query mutations с точным cancel, snapshot и optimistic cache update; проверить тестами успешный ответ, rollback каждого типа ошибки и независимые pending habit ids.
- [x] 4.2 Перевести применение спасательного круга на mutation с заменой overview подтверждённым ответом и целевой invalidation; проверить тестами успешное закрытие подтверждения, pending UI и сохранение данных при ошибке.
- [x] 4.3 Обеспечить server reconciliation после всех progress mutations без широкого invalidation других account/domain keys; проверить QueryClient-тестом, что обновляется только текущий overview key и итог совпадает с refetch response.

## 5. Интеграция экрана

- [x] 5.1 Перевести `SuccessStairsPage` на query data/status/refetch и удалить локальную копию overview и ручной Promise lifecycle; проверить существующим и обновлённым component tests loading, cached content, background fetch, error и «Повторить».
- [x] 5.2 Сохранить текущие русские сообщения, guest state, tabs, optimistic отзывчивость и analytics events без визуального redesign; проверить focused Playwright progress-сценарием на desktop и mobile viewport.
- [x] 5.3 Подтвердить, что Zustand task/XP state и IndexedDB offline queue не импортируют QueryClient и не изменены; проверить scope review через `git diff --name-only` и существующие task/offline tests.

## 6. Финальная проверка и документация

- [x] 6.1 Прогнать focused query/progress/API tests, `npm run typecheck`, `npm run lint`, полный `npm run test` и `npm run build`; проверить, что все команды завершаются успешно и PWA outputs создаются.
- [x] 6.2 Повторить `npm audit --omit=dev`, измерение production bundle и подсчёт ручной server-state orchestration; записать фактический before/after и ограничения pilot в актуальный handoff/roadmap без утверждения о deploy.
- [x] 6.3 Выполнить релевантный Playwright progress flow, `npm exec -- openspec validate --all --strict`, `git diff --check` и итоговый scope review; подтвердить отсутствие backend, Prisma, env, production, LandingPage и несвязанных TanStack-пакетов в diff.
