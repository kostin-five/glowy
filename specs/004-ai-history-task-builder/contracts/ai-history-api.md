# AI History API Contract

All endpoints except the existing public demo require the current auth middleware. The server ignores
any client-supplied user identity.

## GET `/api/ai/mind-hub/history?cursor=<exchangeId>&limit=20`

Returns completed exchanges newest-page-first but arrays in chronological display order.

```json
{
  "exchanges": [{
    "id": 21,
    "userMessage": { "id": "21-user", "role": "user", "text": "..." },
    "assistantMessage": { "id": "21-assistant", "role": "assistant", "text": "..." },
    "drafts": [],
    "createdAt": "ISO-8601"
  }],
  "nextCursor": 1,
  "hasMore": true
}
```

## POST `/api/ai/mind-hub`

Request extends the existing payload with required `clientRequestId`. Registered clients no longer
send authoritative history; server context is used. Response includes the completed exchange.

Duplicate completed ID returns the original exchange without another provider call. A duplicate
pending ID returns `409` with a Russian retry message.

## PATCH `/api/ai/mind-hub/drafts/:draftId`

Request: editable task fields, ordered subtasks and required last-seen `version`.

Returns updated pending draft with incremented version. Stale version or non-pending state returns
`409` plus the current draft when visible to the owner. Foreign/missing IDs return `404`.

## POST `/api/ai/mind-hub/drafts/:draftId/confirm`

Request: `{ "version": number }`. Atomically claims the draft and creates the task with subtasks.
Returns `{ "draft": confirmedDraft, "task": createdTask }`. Repeated confirmation returns the same
created task; stale edit returns `409`.

## DELETE `/api/ai/mind-hub/drafts/:draftId`

Dismisses a pending draft without creating a task. Repeated dismissal is idempotent.

## DELETE `/api/ai/mind-hub/history`

Deletes the owner's conversation, completed exchanges and drafts after client confirmation. Existing
created tasks remain. Returns `204`. No request body text is logged.

