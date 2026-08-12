# Data Model: Серверная история Glowy AI

## AiConversation

- `id`: integer primary key
- `userId`: unique owner relation to User, cascade on account deletion
- `createdAt`, `updatedAt`: timestamps
- Relations: many exchanges, many drafts

Invariant: exactly zero or one conversation per user; every query derives owner from auth.

## AiExchange

- `id`: integer primary key and cursor
- `conversationId`: owning conversation, cascade on conversation deletion
- `clientRequestId`: opaque client-generated UUID-like string, unique within conversation
- `status`: `pending` or `completed`
- `userText`: private user message
- `assistantText`: nullable until completed
- `createdAt`, `completedAt`: timestamps
- Relations: zero to five drafts

Transitions: absent → pending → completed. Provider or persistence failure removes pending exchange.
Only completed exchanges are returned as history or AI context.

## AiTaskDraft

- `id`: integer primary key
- `conversationId`, `exchangeId`: owner scope and originating exchange
- `status`: `pending`, `confirming`, `confirmed`, `dismissed`
- `version`: integer incremented after each accepted edit
- Task snapshot: `title`, `date`, `priority`, `energyLevel`, `category`
- `subtasks`: ordered JSON array `{ title, completed: false, position }`, maximum ten
- `createdTaskId`: nullable unique relation to Task; set after confirmation
- `createdAt`, `updatedAt`: timestamps

Transitions:

```text
pending --edit(version match)--> pending(version + 1)
pending --dismiss-----------> dismissed
pending --confirm claim-----> confirming --task create--> confirmed
```

If confirmation transaction fails, the claim and task creation roll back together. Confirmed and
dismissed drafts are read-only. Conversation deletion removes drafts but uses `SetNull` semantics
for any already-created Task relation, so tasks remain.

## Validation

- message: trimmed, 1..4000 characters
- client request ID: 8..100 safe opaque characters
- title: trimmed, 1..255
- date: `YYYY-MM-DD` or empty string
- category: trimmed, 1..100, default `Быт`
- priority: one of `🔥 P1`, `⚡️ P2`, `💤 P3`
- energy: one of `low`, `med`, `high`
- subtasks: maximum ten; trimmed non-empty unique titles, each maximum 255; sequential positions

