# Telegram Integration Specification

## Purpose

Определяет Telegram Mini App и бот-пульт как безопасные поверхности существующего аккаунта Glowy,
а не отдельный источник данных или обход подтверждений.

## Requirements

### Requirement: Проверенная Mini App сессия

Backend MUST криптографически проверить Telegram initData и его допустимый возраст до восстановления,
регистрации или входа Mini App, после чего SHALL выдавать ограниченную Telegram-сессию, связанную с
конкретной TelegramConnection.

#### Scenario: Повреждённый initData
- **WHEN** Mini App отправляет неверно подписанный или просроченный initData
- **THEN** backend отклоняет запрос и не создаёт сессию или связь аккаунта

### Requirement: Единый аккаунт web и Telegram

Новый пользователь SHALL зарегистрировать обычный Glowy-аккаунт внутри Mini App, существующий SHALL
войти своими учётными данными, а последующие открытия SHALL восстанавливать связанную сессию без
создания дубликата пользователя.

#### Scenario: Вход существующего пользователя
- **WHEN** проверенный Telegram user вводит действующие Glowy credentials
- **THEN** backend связывает TelegramConnection с существующим user и выдаёт Mini App session

### Requirement: Отзыв Telegram-доступа

Пользователь SHALL видеть статус связи, создавать одноразовый ограниченный по времени link code и
отключать Telegram. После unlink прежняя Telegram Mini App session MUST перестать проходить backend
authentication.

#### Scenario: Использование сессии после unlink
- **WHEN** удалённая TelegramConnection указана в ранее выданном token
- **THEN** auth middleware возвращает `401` и не предоставляет доступ к аккаунту

### Requirement: Защищённый и быстрый webhook

Telegram webhook MUST проверять secret token постоянным по времени сравнением, валидировать update,
идемпотентно ставить поддерживаемый update в persistent queue и отвечать до выполнения тяжёлой
обработки.

#### Scenario: Повторный update
- **WHEN** Telegram повторно присылает тот же update_id с правильным secret
- **THEN** queue содержит одну запись, webhook подтверждает приём без повторного действия

#### Scenario: Неверный secret
- **WHEN** webhook вызван без правильного secret token
- **THEN** backend возвращает `401` и не сохраняет payload

### Requirement: Бот как подтверждаемый пульт

Бот SHALL предоставлять навигацию, чтение задач, энергии и прогресса, а также команды для AI и
задач; любое изменение данных SHALL требовать явной команды или callback подтверждения пользователя.

#### Scenario: Добавление задачи через бот
- **WHEN** пользователь описывает новую задачу
- **THEN** бот сохраняет ограниченный по времени draft и создаёт задачу только после подтверждения

### Requirement: Независимость обычного web-приложения

Обычный web-start MUST NOT ждать Telegram SDK. Telegram bootstrap SHALL запускаться только в
Mini App context и завершаться управляемой ошибкой или fallback, если SDK недоступен.

#### Scenario: Открытие сайта вне Telegram
- **WHEN** пользователь открывает обычный web URL без Telegram WebApp API
- **THEN** приложение запускает стандартный auth flow без ожидания Telegram
