# Data Model: v2.9.0 contracts and observability

Изменение не добавляет таблиц и не требует migration. Модель описывает contract/runtime
сущности и существующие поля, участвующие в атомарном AI accounting.

## EndpointContract

- `domain`: `auth | tasks | ai | payments | analytics | profile | notes | telegram`.
- `method`, `path`: стабильная идентичность HTTP operation.
- `auth`: public, user session, Telegram initData или provider secret.
- `request`: params/query/body schema.
- `success`: status и response schema.
- `errors`: допустимые status/code/envelope variants.
- `consumers`: frontend API client, page/store, Telegram worker или внешний provider.
- `stability`: inventory-only, shared-contract candidate или migrated.

Переход: `inventory-only → contract-tested → shared → migrated`. Один operation не становится
`shared`, пока backend validation и consumer parsing не используют один schema source.

## RequestContext

- `requestId`: server-generated UUID, уникальный для запроса.
- `method`, `routeTemplate`: безопасная операция без body/query values.
- `statusCode`, `durationMs`: результат обработки.
- `event`, `errorName`, optional `errorCode`: allowlisted diagnostics.

Запрещены: headers/cookies/token/password/email/initData, request/response body, task/note text,
AI prompt/history/provider payload и payment credentials.

## AiQuotaWindow (existing User fields)

- `userId`: владелец лимита.
- `aiRequestsCount`: уже зарезервированное/использованное количество.
- `aiRequestsResetAt`: конец rolling 24-hour window.
- `plan`, `subscriptionStatus`, `planExpiresAt`: источник effective limit.

### State transitions

1. `expired`: resetAt отсутствует/прошёл → первый atomic reservation устанавливает `count=cost`
   и новый resetAt.
2. `available`: условное atomic increment разрешено только если `count + cost <= limit`.
3. `exhausted`: update не затронул строку → request получает 429 без provider call.
4. `provider-failed`: reservation уменьшается на cost только если окно всё ещё то же.
5. `completed`: reservation остаётся списанным; response получает актуальный limit snapshot.

Инварианты: count не отрицателен; successful reservations не превышают effective limit; один
request освобождает не более своей стоимости; expired Focus сначала нормализуется к Start.

## ProviderCircuitState

- `state`: `closed | open | half-open`.
- `consecutiveRetryableFailures`: 0..3.
- `openedAt`, `retryAt`: monotonic timestamps.
- `probeInFlight`: не более одного half-open probe.

Успех закрывает circuit и обнуляет failures. Non-retryable error не открывает circuit. Три
последовательных retryable failures открывают его на 30 секунд.

## ContractError

- `error`: безопасный русский текст для пользователя.
- `code`: стабильный машинный код внутри мигрированного slice.
- `requestId`: correlation identifier.
- `details`: optional безопасные validation details без исходного private input.

Старые `{message}`/`{errors}` фиксируются inventory и мигрируются только вместе с consumers.
