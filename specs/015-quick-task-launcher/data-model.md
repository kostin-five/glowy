# Data Model: Глобальное быстрое создание задачи

Функция не добавляет persisted entities и не меняет task schema.

## Launcher State

- `isOpen: boolean` — открыт ли единственный dialog создания в текущем layout.
- Начальное состояние: `false`.
- `open` при уже открытом состоянии идемпотентен.
- `close` возвращает состояние в `false`; очистка draft остаётся ответственностью текущей формы.

## Entry Point

- `surface`: desktop sidebar, mobile header, Glowy AI page header, task FAB или task empty state.
- `accessibleName`: «Новая задача» либо существующее «Добавить задачу».
- Все entry points вызывают один и тот же launcher и не содержат task payload.

## Existing Task Draft

- Поля и validation не меняются.
- Account-scoped `mode`, `energy` и `priority` preferences остаются источником presentation.
- Сохранение продолжает идти через существующий task store/API/offline flow.

## State Transitions

```text
closed --entry point--> open
open --repeat entry point--> open
open --cancel / close--> closed, no mutation
open --successful explicit save--> closed, existing task mutation flow
open --save error--> open, draft preserved
```
