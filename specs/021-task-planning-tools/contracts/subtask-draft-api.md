# Contract: AI subtask draft

`POST /api/ai/subtask-draft` требует обычную authenticated session.

Request: `title` 1–255; optional `category`, `priority`, `energyLevel`, `estimatedMinutes`, `existingSubtasks` (не более 30 строк).
Success 200: `{ subtasks: [{ title }], limit }`, 2–8 уникальных шагов.
Errors: 400 invalid request, 401 auth, 429 shared limit exhausted, 502 invalid provider response, 503 expected provider unavailable, 500 unexpected failure.
Один успешный вызов расходует одну единицу; при provider/contract failure reservation освобождается. Endpoint ничего не записывает в Task/SubTask.
