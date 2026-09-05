## Context

См. мотивацию в `proposal.md` и поведенческий контракт в
`specs/progress-analytics/spec.md`. Сейчас `SuccessStairsPage` хранит overview, loading/error,
pending mutations и защиту от поздних ответов в локальном React state. `ProgressApi` уже является
единственной валидируемой сетевой границей, а Zustand отдельно хранит auth snapshot и task/offline
state. Поэтому pilot может заменить только orchestration server state, не меняя backend или API.

## Goals / Non-Goals

**Goals:**

- создать минимальную переиспользуемую основу для последующих независимых server-state slices;
- обеспечить явную account scope границу, отмену запросов и неперсистентный кэш;
- уменьшить ручную асинхронную orchestration в progress page при сохранении текущего UX;
- проверить optimistic mutation, rollback и server reconciliation на существующих привычках.

**Non-Goals:**

- не делать QueryClient источником auth, UI settings или browser-local данных;
- не связывать Query cache с IndexedDB и не заменять task offline sync;
- не абстрагировать все API в универсальный repository layer и не переносить другие страницы;
- не менять публичные HTTP endpoints, shared contracts или backend.

## Decisions

### 1. Один in-memory QueryClient на приложение

Создать отдельный модуль server-state с фабрикой `QueryClient`, production singleton и
`QueryClientProvider` в корневой композиции. По умолчанию queries получают `staleTime` около 30
секунд, `gcTime` около 5 минут, отключённый refetch при фокусе окна и не более одного повтора только
для сетевых/временных server errors. Mutations автоматически не повторяются, поскольку create и
часть других действий не гарантируют безопасный повтор после неопределённого ответа.

Альтернатива — использовать defaults библиотеки. Она отклонена: автоматические повторы и refetch
при фокусе дают менее предсказуемый UX и усложняют тестирование мутаций. Отдельный QueryClient на
каждой странице также отклонён, потому что уничтожает общий lifecycle и будущую переиспользуемость.

### 2. Иерархические account-scoped query keys

Ключ overview строится как `account -> userId -> progress -> today -> month`. Фабрика ключей
остаётся типизированной и экспортирует account-префикс, чтобы lifecycle-код мог отменить и удалить
все данные завершённой сессии. Query отключён для гостя, неаутентифицированного состояния или
отсутствующего `userId`.

Альтернатива — ключ только из месяца. Она отклонена из-за риска повторного показа данных после
logout/login другого пользователя. Глобальный `queryClient.clear()` при каждом auth event безопасен,
но слишком широк для будущих публичных queries; удаление по account-префиксу точнее.

### 3. Очистка предыдущей сессии в общей auth/query границе

Небольшой компонент внутри Query provider наблюдает стабильную identity из auth store. При её
смене он сначала отменяет активные queries прежнего account-префикса, затем удаляет их из кэша.
Поздний Axios-ответ не сможет обновить новую сессию. Для этого `ProgressApi.getOverview` принимает
необязательный `AbortSignal` и передаёт его Axios; HTTP-контракт не меняется.

Альтернатива — очищать кэш только в `useLogout`. Она отклонена, потому что не покрывает unauthorized
event, auth restore и прямую смену сессии. Полагаться только на разные keys также недостаточно:
старые запросы продолжали бы расходовать сеть и хранились бы до garbage collection.

### 4. Progress-specific options и mutation hooks поверх существующего API

Выделить query options/keys и hooks в узком `src/queries/progress`-слое. Query function вызывает
`ProgressApi.getOverview`; Zod validation и auth interceptor остаются в API client. Страница
получает `data`, initial pending, background fetching, error и `refetch`, не дублируя Promise
lifecycle вручную.

Мутации используют один точный overview key. Перед optimistic update они отменяют его запрос и
сохраняют snapshot; ошибка восстанавливает snapshot, успешный ответ обновляет соответствующую
часть или весь overview, а завершение выполняет целевую invalidation для пересчёта streak,
achievements и aggregate fields. Pending habit ids выводятся из выполняющихся mutation variables,
чтобы параллельные действия разных привычек оставались независимыми.

Альтернатива — всегда ждать refetch без optimistic state. Она проще, но ухудшает уже существующую
отзывчивость. Ручное локальное зеркало overview отклонено как второй источник истины.

### 5. Ошибки остаются пользовательским контрактом страницы

Общий QueryClient определяет только допустимость технического retry. Progress hooks возвращают
ошибку, а страница сохраняет текущие спокойные русские сообщения для загрузки и каждого типа
мутации. Background refetch не заменяет уже отображённые данные блокирующим loader; первый запрос
и явный retry сохраняют текущие состояния.

Альтернатива — глобальные toast/error boundary для всех server errors. Она выходит за pilot и
может дублировать существующие сообщения.

### 6. Тестовый QueryClient создаётся на тест

Component/hook tests используют свежий client с `retry: false` и `gcTime: Infinity`, обёрнутый в
provider. Отдельно проверяются key scope, session cleanup/cancellation, cache freshness, late
responses, retry и optimistic rollback/reconciliation. Существующий Playwright progress flow
проверяет сохранение пользовательского поведения.

Альтернатива — тестировать production singleton. Она отклонена из-за межтестового состояния и
нестабильных таймеров.

## Risks / Trade-offs

- [Два источника истины для progress overview] → страница перестаёт хранить копию overview в
  `useState`; изменения выполняются только через query cache.
- [Поздний ответ старой сессии] → account keys, потребление `AbortSignal` и cancel/remove при смене
  identity проверяются отдельным тестом.
- [Optimistic rollback перезаписывает более новую параллельную мутацию] → cancel и snapshot
  ограничиваются точным overview key, pending actions разделяются по habit id, после settle всегда
  выполняется серверная reconciliation.
- [Лишние запросы после каждой мутации] → invalidation только точная; pilot измеряет поведение до
  расширения на другие domains.
- [Рост bundle] → подключается только `@tanstack/react-query`, без devtools, persistence и других
  TanStack-пакетов; production build фиксирует итоговый размер.
- [Автоматический retry неуместной ошибки] → retry predicate исключает `4xx`; mutations не имеют
  автоматического retry.

## Migration Plan

1. Добавить совместимую стабильную версию `@tanstack/react-query`, обновить lockfile и проверить
   dependency tree/audit.
2. Добавить QueryClient, provider, account lifecycle и их unit-тесты, пока существующая страница
   продолжает работать.
3. Добавить progress keys/options/hooks и поддержку `AbortSignal` в `ProgressApi`.
4. Атомарно перевести `SuccessStairsPage` на query data/mutations, обновить component tests и удалить
   старую ручную orchestration.
5. Прогнать focused tests, typecheck, lint, полный frontend unit/build и релевантный Playwright flow;
   задокументировать bundle delta и сокращение ручного server-state кода.

Rollback выполняется обратным коммитом frontend-изменения и удалением зависимости. Кэш существует
только в памяти, API и схема данных не меняются, поэтому migration данных и production rollback
операции не требуются.
