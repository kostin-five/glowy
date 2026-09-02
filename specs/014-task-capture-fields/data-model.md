# Data Model: Быстрое создание и режимы полей задачи

## TaskFormMode

UI preference со значениями:

- `compact` — название и явное раскрытие дополнительных полей;
- `medium` — название, дата, плановое время, категория и разрешённые energy/priority;
- `full` — все поддерживаемые поля и подзадачи.

Не является типом задачи и не отправляется в task API.

## TaskFieldVisibility

Account-scoped UI preference:

- `energy: boolean`, default `true`;
- `priority: boolean`, default `true`.

Скрытие не очищает значения TaskDraft/Task. Unknown или повреждённые persisted значения нормализуются в default.

## AccountTaskFormPreferences

Локальное отображение предпочтений по стабильному публичному идентификатору текущего аккаунта:

- `mode: TaskFormMode`;
- `fields: TaskFieldVisibility`.

Guest получает отдельный namespace. Выход и вход другого аккаунта не показывают предпочтения предыдущего аккаунта.

## TaskDraft

Существующий contract остаётся источником данных формы:

- `title` — обязательная непустая строка после trim;
- `date` — `YYYY-MM-DD` или пустая строка;
- `priority` — существующее совместимое значение;
- `energyLevel` — существующее совместимое значение;
- `category` — optional string;
- `estimatedMinutes` — optional integer 1–1440;
- `subtasks` — существующий ordered draft list.

### State transitions

`closed → open/pristine → open/dirty → submitting → success/closed`

- `open/dirty → mode changed` сохраняет все draft values;
- `submitting → failure` возвращает `open/dirty` с теми же values;
- `open/* → cancel/close` не создаёт и не меняет Task;
- повторный submit во время `submitting` игнорируется.

## Existing Task

Schema и persistence не меняются. При редактировании скрытые поля сохраняют исходные значения. Создание из compact mode использует текущие безопасные defaults (`date: ""`, `priority: "⚡️ P2"`, `energyLevel: "med"`, nullable time, empty category/subtasks).
