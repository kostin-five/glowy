# Research: Telegram Mini App

## Primary surface and launch points

**Decision**: Настроить Main Mini App и постоянную menu button, а ответы бота снабжать private-chat
`web_app` кнопками с URL `/telegram?target=<allowlisted-route>`.

**Rationale**: Telegram официально поддерживает главный профильный Launch button, menu button и
inline Web App buttons. Все они открывают HTML5-приложение внутри Telegram; menu/inline launch
передают проверяемые launch data. Это прямо соответствует ожиданию «Открыть Glowy».

**Alternatives considered**: обычные URL открывают браузер; Login Widget предназначен для сайта,
а не для Mini App; attachment menu расширяет permissions/scope и не нужен v2.8.0.

References: [Telegram Mini Apps](https://core.telegram.org/bots/webapps),
[Mini App client model](https://core.telegram.org/api/bots/webapps).

## Server-side launch validation

**Decision**: Передавать raw `Telegram.WebApp.initData` backend и проверять HMAC по Bot Token,
обязательные `user.id`/`auth_date`, допустимый возраст и точное формирование data-check-string.
`initDataUnsafe` использовать только для безобидного оформления, но не для identity/access.

**Rationale**: Telegram прямо помечает `initDataUnsafe` как недоверенное и требует проверять
`initData` на сервере. Проверка возраста ограничивает replay украденного launch payload. Raw value
не сохраняется и не логируется.

**Alternatives considered**: Telegram user id из frontend body подделывается; username не является
стабильной идентичностью; подпись на frontend раскрыла бы bot token.

Reference: [Validating data received via the Mini App](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

## Glowy account and revocable session

**Decision**: Сохранять единственный `User`. Для первого входа channel endpoints вызывают общие
register/login rules и транзакционно создают `TelegramConnection`; повторный bootstrap выдаёт
обычный HttpOnly JWT-cookie с коротким Telegram channel claim. Auth middleware перепроверяет
connection для такого token на защищённых запросах.

**Rationale**: Пользователь может жить только в Telegram, но его профиль остаётся обычным Glowy
account со всеми тарифами и данными. Channel claim позволяет немедленно отозвать Mini App access
удалением connection, не создавая отдельную session system.

**Alternatives considered**: Telegram-only User дублирует auth/data; 30-дневный JWT без проверки
связи переживает unlink; link code с сайта противоречит самостоятельной регистрации Mini App.

## Reuse of the existing application

**Decision**: `/telegram` является bootstrap route того же React bundle, после которого открываются
существующие защищённые routes. Небольшой provider инкапсулирует Telegram bridge: `ready`, `expand`,
theme, viewport/safe area, back button и external links.

**Rationale**: Один UI/API/store гарантирует одинаковые задачи, заметки, AI, прогресс, аналитику и
настройки. Telegram допускает полнофункциональные web services, а bridge даёт системные параметры
без копирования экранов.

**Alternatives considered**: отдельный Mini App frontend расходится с сайтом; iframe ухудшает auth,
navigation и storage; урезанный экран не соответствует выбранному продуктовому объёму.

Reference: [Telegram Mini Apps JavaScript interface](https://core.telegram.org/bots/webapps#initializing-mini-apps).

## External flows

**Decision**: YooKassa confirmation, восстановление пароля и чувствительные security/legal flows
открывать через Telegram external-link API только по пользовательскому клику и только для
allowlisted HTTPS destinations.

**Rationale**: Основная работа остаётся внутри Mini App, а провайдерские/credential операции не
зависят от ограничений embedded webview. Telegram отдельно описывает событие открытия внешней
ссылки и требует недавнее пользовательское действие.

**Alternatives considered**: `window.location` теряет Mini App context; произвольный URL создаёт
open-redirect риск; Telegram-native payments являются другим payment flow и не входят в feature.

Reference: [Telegram Web events](https://core.telegram.org/api/web-events).

## Rich bot controller

**Decision**: Сохранить прямой Bot API client и DB-backed queue. Добавить Web App navigation,
быстрые чтения `/today`, `/tasks`, `/energy`, `/progress`, подтверждаемые `/add`, `/done`, energy
buttons и read-only `/ai`; полное редактирование открывать в Mini App.

**Rationale**: Бот становится полезным пультом, но не дублирует сложный UI. Существующие worker,
update replay guard, AI limit и task draft уже решают самые рискованные части.

**Alternatives considered**: полный CRUD через диалоги создаёт сложную параллельную UI-модель;
только навигация повторяет прежнюю скудность; новый bot SDK не даёт ценности для текущего объёма.

Reference: [Telegram Bot API: WebAppInfo and buttons](https://core.telegram.org/bots/api#webappinfo).

## Idempotent mutations

**Decision**: `/add` продолжает использовать pending `TelegramTaskDraft`; `/done` показывает
принадлежащие пользователю задачи и требует отдельную confirm callback, затем применяет общий
idempotent completion service; energy button задаёт конкретное значение; AI ничего не сохраняет.

**Rationale**: Повторные webhook/callback не создают задачу, не начисляют XP повторно и не меняют
данные до явной кнопки. Для completion/energy существующего конечного состояния достаточно как
idempotency source, поэтому новая таблица не нужна.

**Alternatives considered**: изменение при первом выборе нарушает подтверждение; отдельная action
queue дублирует webhook queue без необходимости; UI-only disable не защищает от повтора сети.

## Voice and cost boundary

**Decision**: Voice/STT остаётся вне v2.8.0; бот предлагает текст и кнопку Mini App.

**Rationale**: Бесплатный надёжный server-side STT не подтверждён, а новый provider/runtime
нарушил бы согласованный scope и мог создать расходы.

**Alternatives considered**: платный SpeechKit; self-hosted Whisper без оценки Timeweb; случайная
зависимость от Telegram Premium transcription.
