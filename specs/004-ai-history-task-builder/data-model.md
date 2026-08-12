# Data Model: Серверная история Glowy AI

## AiConversation

- `id`: integer primary key
- `userId`: unique owner relation to User, cascade on account deletion
- `createdAt`, `updatedAt`: timestamps
- Relations: many exchanges

Invariant: exactly zero or one conversation per user; every query derives owner from auth.

## AiExchange

- `id`: integer primary key and cursor
- `conversationId`: owning conversation, cascade on conversation deletion
- `clientRequestId`: opaque client-generated UUID-like string, unique within conversation
- `status`: `pending` or `completed`
- `userText`: private user message
- `assistantText`: nullable until completed
- `createdAt`, `completedAt`: timestamps

Transitions: absent → pending → completed. Provider or persistence failure removes pending exchange.
Only completed exchanges are returned as history or AI context.

## Validation

- message: trimmed, 1..4000 characters
- client request ID: 8..100 safe opaque characters
