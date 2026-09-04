# Platform Quality Specification

## Purpose

Определяет сквозные гарантии качества Glowy: типизированные границы, безопасные ошибки и логи,
единый доступ к данным, воспроизводимые проверки и устойчивую web/PWA-оболочку.

## Requirements

### Requirement: Типизированные внешние границы

Frontend и backend SHALL использовать общие Zod-контракты для критичных auth, task, AI и payment
payloads и MUST валидировать client/provider input до использования или записи данных.

#### Scenario: Неожиданный provider payload
- **WHEN** внешний сервис возвращает структуру, не соответствующую ожидаемому контракту
- **THEN** backend возвращает безопасную контролируемую ошибку и не записывает неподтверждённые данные

### Requirement: Единый доступ к PostgreSQL

Backend MUST использовать единственный Prisma client из `backend/lib/prisma.ts`; strict ESM
TypeScript imports SHALL сохранять NodeNext-compatible emitted `.js` suffix без создания второго
client или raw connection pool.

#### Scenario: Новый backend service обращается к данным
- **WHEN** service требуется PostgreSQL операция
- **THEN** он получает общий Prisma instance напрямую или через зависимость, не создавая новое соединение

### Requirement: Безопасные ошибки и request correlation

Каждый API request SHALL получать correlation identifier, а контролируемые error envelopes SHALL
возвращать стабильный code и requestId там, где применяется общий контракт. Operational logs MUST
NOT содержать secrets, auth tokens, passwords, prompts, ответы AI или личный текст пользователя.

#### Scenario: Ошибка закрытого route
- **WHEN** обработчик фиксирует unexpected failure
- **THEN** лог содержит технический event, status и request correlation без пользовательского payload

### Requirement: Backend authority

Authorization, plan entitlements, AI limits, payment verification и чувствительные business rules
MUST выполняться на backend; frontend state не SHALL считаться доказательством доступа или оплаты.

#### Scenario: Клиент отправляет неподтверждённое право
- **WHEN** запрос пытается обойти ограничение только изменённым frontend state
- **THEN** backend повторно проверяет серверные данные и отклоняет недоступную операцию

### Requirement: Проверки перед интеграцией

Каждое изменение SHALL проходить проверки, соразмерные риску: TypeScript, lint, unit/API tests и
production build для затронутых слоёв, а auth, task mutation, AI, payment и mobile flows SHALL
дополнительно иметь целевую автоматизированную или явно зафиксированную ручную проверку.

#### Scenario: Релевантная проверка падает
- **WHEN** change не проходит относящийся к нему gate
- **THEN** ошибка исправляется либо явно документируется как блокирующий риск до интеграции

### Requirement: Безопасность production-изменений

Production deploy, restart, schema migration, payment activation и внешняя конфигурация MUST
выполняться только после явного согласия владельца. Migration PostgreSQL дополнительно MUST иметь
подтверждённый backup и rollback plan; `prisma migrate reset` и `prisma db push` запрещены в
production.

#### Scenario: Change требует schema migration
- **WHEN** реализация готова локально, но backup и approval не подтверждены
- **THEN** migration остаётся подготовленной и не применяется к production

### Requirement: Устойчивая web/PWA-оболочка

Glowy SHALL оставаться доступным как responsive web/PWA вне Telegram, корректно переживать update
service worker и сохранять русскоязычный интерфейс до отдельного i18n change.

#### Scenario: Обновление существующего service worker
- **WHEN** браузер получает новый controller для уже установленного PWA
- **THEN** приложение выполняет не более одной управляемой перезагрузки для перехода на новую версию
