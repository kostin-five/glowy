## Why

Spec Kit помог запустить дисциплину specification-first, но для зрелого Glowy его набор из 24
изолированных feature-папок больше не даёт одного актуального описания возможностей продукта.
OpenSpec лучше соответствует brownfield-разработке: хранит канонические capability-specs,
описывает изменения через дельты и архивирует завершённые решения без потери истории.

## What Changes

- Добавить закреплённый OpenSpec CLI и воспроизводимые команды в корневой `package.json`.
- Сделать `openspec/` активным источником specification и change-артефактов проекта.
- Настроить русскоязычный project context, обязательные правила безопасности, структуры
  артефактов и проверки перед архивированием.
- Создать канонические specs существующих продуктовых возможностей на основе актуального кода,
  архитектуры, roadmap и исторических Spec Kit-материалов.
- Перевести инструкции разработчика, конституцию, onboarding, architecture и roadmap на workflow
  OpenSpec: explore → propose → review → apply → verify → archive.
- Сохранить `.specify/` и `specs/001-*`…`specs/024-*` как read-only исторический архив; ничего не
  удалять и не переписывать задним числом.
- **BREAKING (process only):** новые крупные изменения больше не создаются через Spec Kit.
  Пользовательское и API-поведение продукта не меняется.

## Capabilities

### New Capabilities

Нет. Работа переносит процесс разработки и документирует уже существующее поведение, не добавляя
новую пользовательскую возможность.

### Modified Capabilities

Нет. Канонические specs фиксируют текущий baseline; продуктовые requirements не меняются.

## Impact

Изменяются developer tooling и документация: `package.json`, `package-lock.json`, `.agents/skills/`,
`openspec/`, `AGENTS.md`, `.specify/memory/constitution.md`, архитектурные, onboarding-, handoff- и
roadmap-документы. Runtime-код, API, схема базы, production и пользовательские данные не
затрагиваются. Исторические Spec Kit-артефакты остаются доступными для трассировки решений.
