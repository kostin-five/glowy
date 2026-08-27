# Research: Telegram Bot MVP

## Telegram transport

**Decision**: Использовать официальный HTTPS Bot API напрямую через небольшой backend client на
стандартном `fetch`, без Telegram framework/SDK.

**Rationale**: MVP использует ограниченный набор `sendMessage`, `answerCallbackQuery`,
`editMessageReplyMarkup`, `setWebhook` и `getWebhookInfo`. Малый adapter проще внедрять в тестах,
не добавляет dependency churn и сохраняет токен только на backend. Официальный Bot API принимает
webhook updates как JSON и повторяет запрос при ответе вне `2xx`.

**Alternatives considered**: Telegraf/grammY избыточны для пяти команд; long polling конфликтует с
активным webhook и не соответствует roadmap.

Reference: [Telegram Bot API](https://core.telegram.org/bots/api).

## Webhook authentication and acknowledgement

**Decision**: Проверять `X-Telegram-Bot-Api-Secret-Token` отдельным env-secret, сохранять update
идемпотентно и отвечать `200` до внешних вызовов и AI.

**Rationale**: `setWebhook.secret_token` официально передаётся Telegram в этом header; `update_id`
предназначен для защиты от повторов. Очередь в существующей БД делает быстрый ACK устойчивым к
повторной доставке и перезапуску без нового Redis.

**Alternatives considered**: AI внутри HTTP request создаёт таймауты; fire-and-forget без
сохранения теряется при restart; проверка только IP не заменяет secret.

References: [setWebhook](https://core.telegram.org/bots/api#setwebhook),
[webhook guide](https://core.telegram.org/bots/webhooks).

## Safe account linking

**Decision**: Генерировать 12-символьный случайный base64url-код на 10 минут, хранить только HMAC
кодового значения и употреблять его атомарно при `/start <code>`. Один пользователь и один
Telegram имеют по одному активному соединению.

**Rationale**: Код легко передать через deep-link, имеет достаточную энтропию, не является
паролем/JWT и бесполезен после короткого срока или первого использования. HMAC не позволяет
проверять кандидаты без server-side secret.

**Alternatives considered**: JWT/web-cookie нарушают auth-границу; email/Telegram username не
доказывают владение; открытый код увеличивает последствия доступа к БД.

## Idempotent task confirmation

**Decision**: Сохранять pending task draft и подтверждать его транзакцией: conditional state
transition `PENDING -> CONFIRMED` плюс создание Task и запись `taskId`.

**Rationale**: Telegram callback и webhook могут повториться. Условное обновление в общей
транзакции гарантирует одну задачу без доверия к Telegram UI.

**Alternatives considered**: создание при получении текста нарушает контроль пользователя;
отключение кнопки не блокирует повторный network request; одного update id недостаточно, потому что
разные callback updates одной кнопки имеют разные ids.

## AI draft generation

**Decision**: Обобщить текущий `note-task-draft` генератор до общего text-to-task draft helper и
использовать существующие `getAuthenticatedAiRequestLimit`, provider и
`consumeAuthenticatedAiRequest`.

**Rationale**: Бот получает один реалистичный черновик и не создаёт новый AI-flow. Лимиты,
credentials, fallback и безопасные ошибки остаются server-side и совпадают с веб-сценарием.

**Alternatives considered**: внутренний HTTP/JWT создаёт ложную auth-сессию; прямой DeepSeek
дублирует provider и может обойти лимиты; сохранение исходного текста не выполняет AI draft flow.

## Voice scope

**Decision**: В v2.8.0 не загружать и не распознавать voice. Ответить по-русски с предложением
продублировать мысль текстом; STT вынести в v2.8.1.

**Rationale**: Пользователь потребовал бесплатное решение. SpeechKit тарифицируется, а
self-hosted Whisper требует отдельной runtime/ресурсной оценки Timeweb. Решение сохраняет
текстовый MVP без скрытых расходов и параллельного AI-сервиса.

**Alternatives considered**: платный SpeechKit; ресурсоёмкий self-hosted Whisper; Telegram
transcription, которая не гарантирована как бесплатная возможность обычного Bot API.

## Data minimization and cleanup

**Decision**: Не хранить Telegram username, имена или аудио. Очередь временно хранит только
необходимый JSON update, очищает payload после обработки и не позднее 30 минут; idempotency row без
payload хранится 7 дней. Pending drafts истекают через 30 минут.

**Rationale**: Для retry нужен входной update, но после обработки достаточно `updateId` и статуса.
Логи используют только event name, request id, status/error code и никогда не включают payload.

**Alternatives considered**: полный webhook в логах раскрывает сообщения; отсутствие durable
payload ломает recovery; бессрочное хранение не соответствует минимизации данных.
