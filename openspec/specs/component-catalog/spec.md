# Component Catalog Specification

## Purpose

Определяет локальный каталог Glowy components, чтобы разработчик мог проверять состояния, темы, mobile layout и accessibility новых primitives до интеграции в пользовательские маршруты.

## Requirements

### Requirement: Локальный каталог изолированных состояний компонентов

Репозиторий SHALL предоставлять локальный React/Vite component catalog для Glowy primitives. Catalog MUST запускаться и собираться без auth, backend, пользовательских данных, production credentials или облачного visual-regression service; он MUST NOT добавляться в пользовательскую навигацию или PWA маршруты.

#### Scenario: Разработчик открывает catalog локально
- **WHEN** он запускает документированную команду component catalog
- **THEN** он видит изолированные состояния shared primitives без входа в аккаунт и API requests

#### Scenario: Catalog собирается в CI
- **WHEN** frontend tooling выполняет documented catalog build
- **THEN** build завершается без обращения к production или изменения product artifact

### Requirement: Обозримые темы и accessibility states

Catalog SHALL содержать stories для light и dark тем, compact mobile viewport и ключевых состояний каждого primitive: default, disabled, loading, empty или error там, где они применимы. Stories MUST делать доступным keyboard-visible focus и проверку базовых accessibility violations локальными средствами.

#### Scenario: Разработчик проверяет mobile Dialog
- **WHEN** он открывает story overlay component в mobile viewport
- **THEN** sheet или dialog остаётся в пределах viewport, имеет доступное имя и позволяет закрыться с keyboard

#### Scenario: Меняется shared primitive
- **WHEN** change затрагивает visual или interaction contract primitive
- **THEN** reviewer может сравнить его documented stories в обеих темах до интеграции в product route

### Requirement: Воспроизводимые команды и границы публикации

Component catalog MUST иметь документированные команды локального запуска, сборки и проверок. Его static output SHALL оставаться локальным build artifact, пока владелец отдельно не утвердит hosting, домен, external access или cloud visual service.

#### Scenario: Разработчик готовит change к review
- **WHEN** он добавляет или меняет shared primitive
- **THEN** документация указывает, какие local catalog и test commands нужно выполнить, а published endpoint не появляется автоматически
