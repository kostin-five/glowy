# Research: Backend TypeScript Migration

## R1. Production execution model

**Decision**: Компилировать backend через `tsc` в ignored-каталог `backend/dist` и запускать production-код обычным Node.js из `dist/server.js`.

**Rationale**: TypeScript не участвует в production hot path, PM2 и Nginx остаются теми же компонентами, а собранный ESM JavaScript можно проверить до переключения entrypoint. Node.js 22 не предоставляет достаточно стабильной для проекта причины полагаться на прямой запуск всего TS-дерева.

**Alternatives considered**: `tsx`/`ts-node` добавляют runtime loader; native type stripping сильнее связывает release с версией Node; ручное хранение JS рядом с TS создаёт два источника истины.

## R2. Mixed-state migration

**Decision**: На время срезов использовать `allowJs: true` в build-конфигурации, сохраняя строгую проверку уже переведённых `.ts`; после последнего среза удалить mixed-state допуск и включить финальный inventory gate.

**Rationale**: 95 файлов нельзя безопасно переводить атомарно. TypeScript копирует оставшийся JS в `dist`, поэтому один собранный граф может содержать переведённые и ещё не переведённые модули.

**Alternatives considered**: один массовый rename нарушает требование малых изменений; `checkJs: true` на всём старом дереве создаёт большой шум до миграции.

## R3. ESM import specifiers

**Decision**: В `.ts`-исходниках сохранять относительные runtime specifiers с расширением `.js`; TypeScript `NodeNext` разрешает их к `.ts`-источникам и оставляет корректными в emitted ESM.

**Rationale**: Node.js ESM требует расширения в runtime import, а output-файлы действительно имеют `.js`.

## R4. Strictness at external boundaries

**Decision**: Считать `req.body`, provider responses, webhook payloads, decoded tokens и caught errors недоверенными; использовать `unknown`, существующие Zod schemas и локальные type guards. `any` разрешается только как узкое документированное исключение при несовместимой сторонней типизации.

**Rationale**: Главная ценность миграции — ошибки на границах, а не косметические аннотации внутри модулей.

## R5. Express request context

**Decision**: Описать существующие auth/request поля через единое module augmentation в `backend/types`, не создавать собственный параллельный Request abstraction.

**Rationale**: Сохраняется Express middleware flow и исчезает повторение пересечений типов в каждом route.

## R6. Prisma types

**Decision**: Сохранить один shared Prisma client и получать типы из сгенерированного клиента только для compile-time использования. Схема, migrations и query behavior не меняются.

**Rationale**: Это соблюдает существующую архитектуру и исключает второй connection pool.

## R7. Tests

**Decision**: Перевести все 49 tracked backend test files в TypeScript и выполнять их как скомпилированный JavaScript из `dist/test` стандартным Node test runner. До перевода конкретного тестового среза сохранять текущий source test command.

**Rationale**: Один compiler проверяет production и test helpers, а новый TS runtime loader не нужен.

## R8. Slice order

**Decision**: Foundation → pure libraries/contracts → middleware/auth/profile → tasks/notes/analytics → AI → payments → Telegram/entrypoints/scripts → tests/final gate.

**Rationale**: Сначала стабилизируются типы с большим fan-out, затем домены с повышенным риском. Каждый срез сохраняет рабочий mixed build и отдельный rollback boundary.

## R9. Inventory and exclusions

**Decision**: Зафиксировать исходные 95 tracked backend `.js` файлов и проверять финалом нулевой остаток. `ai-proxy/server.js` исключён, потому что это отдельный deployable component и rollback unit.

## R10. Deployment and rollback

**Decision**: Подготовить build/start commands и инструкции, но не менять Timeweb/PM2 и не деплоить без отдельного разрешения. Rollback релиза — предыдущий commit/artifact и прежний JS entrypoint; rollback среза — revert его сфокусированного commit.

**Rationale**: Кодовая готовность не является разрешением на production mutation.
