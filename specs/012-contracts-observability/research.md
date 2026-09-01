# Research: v2.9.0 — Типы, контракты и наблюдаемость

## Decision 1 — Release slicing

**Decision**: Инвентаризировать все endpoints сразу. Реализовать AI, auth, tasks и payments
последовательными slices; AI идёт первым. Analytics, profile, notes и Telegram получают полную
карту контрактов, но не обязаны полностью перейти на shared contracts в v2.9.0. Их точки,
использующие общий AI-limit/provider flow, участвуют в AI slice.

**Rationale**: Это соответствует roadmap и clarify. Каждый slice можно проверить и откатить
отдельно, а несовместимость имеет ограниченный источник.

**Alternatives considered**: Только AI foundation — недостаточно для утверждённого полного
релиза; все восемь доменов сразу — смешивает механическую типизацию с поведением и повышает риск.

## Decision 2 — Shared contract ownership

**Decision**: Добавить один внутренний package `packages/contracts` с Zod schemas и выводимыми
типами. Frontend API clients и backend adapters импортируют один и тот же контракт. Package
имеет собственную сборку и tests; зависимости frontend/backend остаются явными.

**Rationale**: Одна runtime schema устраняет ручное расхождение интерфейсов. Отдельный package
не является новой бизнес-архитектурой и не связывает frontend с внутренней директорией backend.

**Alternatives considered**: Дублировать schemas в `src` и `backend` — создаёт два источника
истины; импортировать frontend-файл из backend — нарушает границы packages; сразу генерировать
полный OpenAPI — расширяет scope и не решает runtime validation сам по себе.

## Decision 3 — Incremental backend TypeScript foundation

**Decision**: Добавить проверяемую TypeScript-сборку, которая допускает текущий ESM JavaScript и
строго проверяет новые/перенесённые TypeScript-модули. Подключать файлы по одному домену; не
переименовывать весь backend. Существующий production entrypoint меняется только после отдельной
локальной/dev проверки и документированного rollback.

**Rationale**: Позволяет использовать shared inferred types, сохраняя малый diff и разделяя
типизацию от бизнес-изменений.

**Alternatives considered**: Массовый `.js` → `.ts` — запрещён roadmap; только JSDoc — не даёт
полноценной foundation для последующих slices; runtime TypeScript без build — добавляет
необязательную production-зависимость.

## Decision 4 — Unauthenticated AI

**Decision**: Удалить `/api/ai/mind-hub/public`. Guest/demonstration state, если сохранился в
браузере, не вызывает AI и получает предложение зарегистрироваться. Остальная локальная demo
логика не удаляется массово в AI slice. LandingPage не меняется без отдельного запроса.

**Rationale**: В текущем UI нет гостевого входа, но публичный endpoint можно вызвать напрямую.
Закрытие backend route устраняет расход и обход auth независимо от клиента.

**Alternatives considered**: Shared database limiter оставляет публичный расход и требует
дополнительной модели/migration; in-memory limiter не согласован между процессами; регистрация
для AI соответствует текущему продукту.

## Decision 5 — Atomic AI quota reservation

**Decision**: Заменить read/check/write на атомарное условное reservation существующих полей
пользователя. Reservation выполняется до provider call для Mind Hub, analytics insight, note
draft и Telegram AI. При подтверждённом provider failure reservation освобождается только в том
же окне; успешный запрос остаётся списанным. Новая таблица и migration не нужны.

**Rationale**: Условное обновление не позволяет параллельным запросам превысить остаток и
сохраняет прежнее правило: недоступность провайдера не расходует лимит.

**Alternatives considered**: Serializable transaction над текущим multi-step flow требует
retry semantics и дольше держит транзакцию; advisory lock/raw SQL усложняет переносимость;
схема reservations надёжнее для распределённых jobs, но требует migration и не нужна текущему
масштабу.

## Decision 6 — Provider reliability

**Decision**: Считать существующий `AI_PROVIDER_TIMEOUT_MS` общим бюджетом direct primary +
fallback, а не отдельным бюджетом каждого вызова. Добавить in-process circuit breaker на
retryable provider failures: три последовательных сбоя открывают circuit на 30 секунд, затем
разрешается один half-open probe. Не выполнять бесконечные retry.

**Rationale**: Production использует один PM2 backend process; in-process breaker даёт защиту
без новой инфраструктуры. Общий deadline ограничивает худшее пользовательское ожидание.

**Alternatives considered**: Redis/distributed breaker — новая инфраструктура; отсутствие
breaker продолжает умножать заведомо неуспешные обращения; отдельные полные timeouts для двух
providers удваивают ожидание.

## Decision 7 — Logging and request correlation

**Decision**: Сохранять сгенерированный сервером request ID, возвращать его заголовком и в
безопасных error envelopes. Добавить completion events с route template, status и duration.
Logger принимает только утверждённые операционные поля и дополнительно redacts опасные ключи и
значения; request bodies, query values, headers, emails, task/note text, prompts и initData не
логируются.

**Rationale**: Server-generated ID нельзя заставить содержать пользовательские данные. Route
template полезен для расследования и не раскрывает конкретные identifiers.

**Alternatives considered**: Полное логирование request/response — недопустимо по privacy;
только stack traces без correlation — недостаточно; внешний tracing vendor требует env и
production approval.

## Decision 8 — Contract compatibility and rollout

**Decision**: Сначала зафиксировать фактические ответы, включая текущую неоднородность
`{error}`, `{message}` и validation `{errors}`. Внутри каждого slice добавить общий additive
error envelope (`code`, `error`, `requestId`, optional `details`) только там, где consumer
обновляется вместе с backend. Не удалять старые успешные поля. Deploy/production checks не
выполнять без отдельного разрешения.

**Rationale**: Фиксация факта предотвращает случайный breaking change; additive rollout
сохраняет старых consumers.

**Alternatives considered**: Одномоментно унифицировать все ошибки — слишком широкий breaking
change; оставить только frontend casts — не защищает runtime boundary.
