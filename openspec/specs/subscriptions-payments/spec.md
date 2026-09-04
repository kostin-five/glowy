# Subscriptions and Payments Specification

## Purpose

Определяет серверный источник истины для Start, Focus и Forever, безопасное создание платежа
YooKassa и выдачу entitlement только после проверенного события провайдера.

## Requirements

### Requirement: Серверный статус тарифа

Backend MUST быть источником истины для plan, subscriptionStatus и planExpiresAt. Истёкший активный
Focus SHALL нормализоваться в Start/expired, а действующий Forever SHALL сохраняться без даты
истечения.

#### Scenario: Истёкший Focus
- **WHEN** пользователь запрашивает текущий план после planExpiresAt
- **THEN** backend сохраняет Start/expired и возвращает нормализованный публичный статус

### Requirement: Создание checkout

Только авторизованный пользователь SHALL создавать checkout поддерживаемого плана; backend SHALL
применять rate limit, проверять конфигурацию и действующий entitlement, создавать idempotence key и
сохранять локальную Payment до возврата confirmation URL.

#### Scenario: Уже активный план
- **WHEN** пользователь пытается повторно оформить действующий Focus или Forever
- **THEN** backend возвращает conflict и не создаёт новый платёж у провайдера

### Requirement: Проверка webhook провайдером

Получение webhook MUST NOT само по себе активировать тариф. Backend SHALL повторно запросить платёж
у YooKassa и сверить provider id, status, amount, currency, userId, plan и локальную Payment до
изменения пользователя.

#### Scenario: Несовпадающая сумма или metadata
- **WHEN** YooKassa-ответ не совпадает с ожидаемыми локальными параметрами
- **THEN** backend подтверждает безопасную обработку webhook, но не помечает Payment paid и не выдаёт тариф

### Requirement: Идемпотентная активация

Успешный проверенный webhook SHALL атомарно пометить Payment оплаченной и активировать план ровно один
раз; повторное событие не SHALL продлевать или повторно менять entitlement.

#### Scenario: Повтор payment.succeeded
- **WHEN** webhook успешно обработанной Payment приходит повторно
- **THEN** backend возвращает acknowledgement без повторной активации

### Requirement: Управляемая доступность Forever

Существующий активный Forever MUST сохранять пожизненный доступ. Бесплатная legacy-активация SHALL
возвращать `410`, а создание платного Forever checkout SHALL быть недоступно без серверного feature
flag и корректной цены.

#### Scenario: Forever feature flag выключен
- **WHEN** пользователь пытается создать платный Forever checkout
- **THEN** backend возвращает контролируемый `403` и не обращается к YooKassa

### Requirement: Backend entitlements

Доступ к premium tone, beta-возможностям и AI-аналитике MUST проверяться на backend по действующему
Focus или Forever, независимо от состояния frontend.

#### Scenario: Подмена клиентского plan
- **WHEN** клиент заявляет premium-состояние без действующего серверного entitlement
- **THEN** закрытая premium-операция отклоняется без изменения данных
