# Data Model: Разгрузка мыслей

## Existing persisted entities

### Task

Существующая сохранённая задача пользователя. Структура и схема БД не меняются.

Relevant fields:

- `id`: положительный идентификатор после сохранения.
- `title`: непустая строка, максимум 255 символов.
- `date`: `YYYY-MM-DD` или пустая строка на frontend boundary.
- `priority`: одно из `🔥 P1`, `⚡️ P2`, `💤 P3`.
- `energyLevel`: `low`, `med` или `high`.
- `category`: строка существующей категории, максимум 100 символов.
- `subtasks`: упорядоченный список сохранённых SubTask.

### SubTask

Существующий сохранённый шаг задачи. Создаётся вместе с Task через nested create.

Relevant fields:

- `id`: положительный идентификатор после сохранения.
- `taskId`: связь с Task.
- `title`: непустая строка.
- `completed`: `false` для нового подтверждённого черновика.
- `position`: порядок шага, начиная с 0.

## New non-persisted entities

### MindHubDraft

Несохранённое AI-предложение, совместимое с существующим TaskDraft.

Fields:

- `title`: редактируемое название; обязательно, 1–255 символов после trim.
- `date`: нормализованная дата в frontend contract.
- `priority`: допустимый существующий priority.
- `energyLevel`: допустимый существующий energy level.
- `category`: нормализованная категория.
- `subtasks`: 0–10 редактируемых MindHubDraftStep.
- `localId`: только frontend key; не передаётся как database id.
- `status`: локальное состояние `pending | saving | failed`.

Validation:

- Пустое название блокирует подтверждение.
- Пустые шаги отбрасываются перед сохранением.
- Позиции оставшихся шагов пересчитываются последовательно.
- После успешного сохранения draft удаляется из pending state.

### MindHubDraftStep

Несохранённый редактируемый шаг.

Fields:

- `localId`: frontend key для редактирования списка.
- `title`: редактируемый текст; пустой элемент не сохраняется.
- `position`: вычисляется из порядка в карточке.

### MindHubResponse

Результат одного AI-запроса.

Fields:

- `reply`: короткий ответ пользователю или safe fallback.
- `drafts`: массив 0–5 MindHubDraft без local UI fields.
- `limit`: существующая server-side информация о лимите.
- `retryable` / `code`: существующие optional признаки недоступности AI.

## State transitions

```text
AI response
  -> no draft: reply only
  -> draft pending
       -> edit title/steps -> pending
       -> reject -> discarded (no persistence)
       -> confirm -> saving
            -> Task API success -> saved Task + remove draft
            -> Task API failure -> failed -> edit or retry
```

## Persistence boundary

- AI endpoints only read active tasks/user energy and consume AI usage.
- Drafts never enter Zustand task list, progress calculations or database before confirmation.
- `useTaskStore.createTask` remains the only frontend path used by this feature to persist a
  confirmed draft.
- No Prisma schema or migration changes.

