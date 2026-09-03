# Data Model: Понятный диалог Glowy AI

## Account-scoped conversation map

Ключ — `user:<id>` для зарегистрированного пользователя, `guest` для локального demo и `anonymous` до авторизации. Значение содержит массив сообщений и неподтверждённых черновиков. Данные одного ключа никогда не подмешиваются в другой; единое состояние версии 1 становится `legacyConversation` и присваивается первому активному scope один раз.

## MindHubChatMessage

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | number | yes | Finite local identifier |
| `role` | `user \| assistant` | yes | Existing role contract |
| `text` | string | yes | Existing message text |
| `createdAt` | string | no | Valid ISO timestamp for newly appended messages; absent legacy value remains absent |
| `linkedTask` | object | no | Present only on an assistant result after explicit task confirmation |

### Linked task snapshot

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | number | yes | Finite non-zero identifier returned by existing online or offline task creation |
| `title` | string | yes | Non-empty trimmed display snapshot |

## StarterPrompt

| Field | Type | Rules |
|---|---|---|
| `title` | string | Short Russian action label |
| `description` | string | Explains expected outcome |
| `prompt` | string | Editable example inserted into composer |

Starter prompts are constants and are not persisted.

## UI-only state

- `isClearConfirmationOpen`: confirmation is visible; no data changed yet.
- `isJumpToLatestVisible`: user is away from the conversation bottom.

## State transitions

```text
empty conversation -> choose starter -> composer filled -> explicit send
AI draft -> explicit confirm -> task created -> assistant message with linkedTask
clear action -> confirmation -> cancel (unchanged) | confirm (messages + drafts cleared)
near bottom -> scroll up -> jump visible -> activate -> bottom + jump hidden
```

## Compatibility

- Legacy messages without `createdAt` and `linkedTask` remain valid.
- Version 1 conversation state is claimed by the current account once and then stored under that scope.
- Switching account scope selects another isolated conversation without deleting the previous one.
- Invalid optional metadata is discarded while the valid base message is retained.
- Clearing conversation removes messages and pending AI drafts only; task records are never included.
