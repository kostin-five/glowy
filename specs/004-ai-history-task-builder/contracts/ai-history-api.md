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
    "createdAt": "ISO-8601"
  }],
  "nextCursor": 1,
  "hasMore": true
}
```

If history storage is temporarily unavailable, the endpoint returns `503` with a Russian error and
`historyUnavailable: true`. The client keeps its local conversation and does not disable sending.

## POST `/api/ai/mind-hub`

Request extends the existing payload with `clientRequestId`. Registered clients also send their
bounded local messages as a fallback; when server history is available, its owner-scoped context is
used instead. Response includes the completed exchange when persistence succeeds.

Duplicate completed ID returns the original exchange without another provider call. A duplicate
pending ID returns `409` with a Russian retry message.

If reservation or persistence of history fails, the existing AI request still completes through the
provider and returns the ordinary response with `historySynced: false`. No task is created implicitly.

## DELETE `/api/ai/mind-hub/history`

Deletes the owner's conversation after client confirmation. Existing tasks and local drafts remain.
Returns `204`. No request body text is logged.
