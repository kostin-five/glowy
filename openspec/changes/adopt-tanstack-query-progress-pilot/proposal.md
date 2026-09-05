## Why

Экран «Мой прогресс» вручную управляет загрузкой, отменой устаревших ответов, retry, optimistic
updates и повторными запросами после мутаций. Ограниченный pilot TanStack Query позволит проверить
единый server-state подход на реальном account-scoped сценарии до v3.0.0, не затрагивая предметную
offline-архитектуру задач.

## What Changes

- Добавить общий `QueryClient` и React provider с консервативной политикой retry, stale time и
  garbage collection для неперсистентного server-state кэша.
- Ввести типизированную фабрику query keys, в которой данные прогресса обязательно разделены по
  `userId`, `today` и выбранному месяцу.
- Перевести загрузку progress overview и мутации привычек/спасательного круга на TanStack Query,
  сохранив текущие русские loading, empty, pending и error-состояния.
- Сохранять быстрые optimistic updates привычек, откатывать их при ошибке и согласовывать кэш с
  подтверждённым ответом backend или целевой invalidation.
- Отменять или удалять account-scoped запросы при смене сессии, чтобы данные предыдущего аккаунта
  не отображались и не применялись к новой сессии.
- Добавить тесты query policy, смены аккаунта, отмены устаревших запросов, retry и мутаций; измерить
  удаление ручного server-state кода в pilot-экране.

### Non-goals

- Не переносить tasks/subtasks, их IndexedDB snapshot, offline queue или optimistic XP в TanStack
  Query.
- Не переводить Notes, Analytics, AI, auth, payments или settings в рамках этого изменения.
- Не добавлять persisted query cache, offline mutations, TanStack Router/Start/Table либо Devtools
  в production bundle.
- Не менять React, Express, API-контракты, Prisma schema, пользовательские тексты, визуальный дизайн
  или `src/pages/LandingPage.tsx`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `progress-analytics`: frontend SHALL изолировать кэш progress overview по аккаунту и параметрам,
  безопасно обрабатывать устаревшие запросы и сохранять согласованное состояние после мутаций.

## Impact

- Frontend dependency tree: новая runtime-зависимость `@tanstack/react-query` и lockfile.
- Frontend composition: единый Query provider/client рядом с корнем приложения.
- Progress slice: `src/pages/SuccessStairsPage.tsx`, выделенные query keys/hooks и относящиеся к ним
  unit/component tests; `src/api/ProgressApi.ts` остаётся сетевой границей.
- Runtime: появляется только in-memory server-state кэш текущей browser session; данные не
  персистируются и не отправляются новым сервисам.
- Данные и production: backend, PostgreSQL, migrations, env и deploy не меняются.
- Rollback: удалить Query provider/dependency и вернуть экран прогресса к прежней локальной модели;
  серверные и пользовательские данные преобразовывать не требуется.
