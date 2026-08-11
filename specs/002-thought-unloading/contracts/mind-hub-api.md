# Contract: Mind Hub becomes Разгрузка мыслей

## POST `/api/ai/mind-hub`

Authenticated AI request. Existing auth cookie/token and server-side plan limit apply.

### Request

```json
{
  "message": "Нужно подготовить доклад: сначала собрать источники, потом сделать слайды",
  "hubMode": "auto",
  "messages": [
    { "role": "user", "text": "..." },
    { "role": "assistant", "text": "..." }
  ],
  "currentEnergy": 55
}
```

Validation:

- `message` is trimmed and must be non-empty.
- `hubMode` accepts the existing `auto | chat | parse` values for compatibility.
- Only valid recent conversation messages are used for context.
- Client energy is advisory; authenticated persisted energy remains authoritative.

### Success: reply only

```json
{
  "drafts": [],
  "reply": "Похоже, тебе важно сначала понять требования к докладу. Начни с короткого списка вопросов преподавателю.",
  "limit": {
    "limit": 10,
    "remaining": 9,
    "resetAt": "2026-08-13T00:00:00.000Z"
  }
}
```

### Success: reply with editable draft

```json
{
  "drafts": [
    {
      "title": "Подготовить доклад",
      "date": "2026-08-12",
      "priority": "⚡️ P2",
      "energyLevel": "high",
      "category": "Учеба",
      "subtasks": [
        { "title": "Собрать источники", "completed": false, "position": 0 },
        { "title": "Сделать слайды", "completed": false, "position": 1 }
      ]
    }
  ],
  "reply": "Я собрал это в один черновик со спокойной последовательностью шагов. Проверь его перед сохранением.",
  "limit": {
    "limit": 10,
    "remaining": 9,
    "resetAt": "2026-08-13T00:00:00.000Z"
  }
}
```

Contract rules:

- This endpoint MUST NOT create or update Task/SubTask records.
- `drafts` never contains database `id`, `userId`, `xp` or completion metadata for a saved task.
- `reply` is preserved when drafts are present.
- Invalid AI task elements are removed during normalization.
- Duplicate active task suggestions are omitted; reply explains the duplicate when relevant.
- Legacy `actions.updatedTasks` is not returned by this flow.

### Limit reached

HTTP 429 with existing safe Russian error and limit metadata. No drafts are returned or saved.

### AI unavailable / malformed provider response

Returns the existing graceful unavailable shape or a safe error response with `drafts: []`. It
never creates heuristic tasks from an ordinary question.

## POST `/api/ai/mind-hub/public`

Same `reply` + `drafts` contract with existing guest rate limiting. Draft confirmation uses the
existing guest-local `useTaskStore.createTask`; the AI endpoint does not create fake saved Task
objects.

## POST `/api/tasks`

Existing endpoint, unchanged. Called only after explicit confirmation with one edited TaskDraft.
It remains responsible for auth, validation and atomic creation of the task with nested subtasks.

## Analytics contract

On successful confirmation, emit `ai_draft_confirmed` through the existing consent-aware helper.
No message, reply, title, category or subtask text is attached.

