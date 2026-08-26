# Data Model: Умные заметки

## Note

| Field | Shape | Rules |
| --- | --- | --- |
| `id` | integer | Primary key, stable server identifier |
| `userId` | integer | Required owner, cascade with user |
| `title` | string | Trimmed, 0–200 characters |
| `content` | string | 0–50 000 characters |
| `archived` | boolean | Default `false` |
| `createdAt` | datetime | Server generated |
| `updatedAt` | datetime | Server updated on every persisted edit/archive change |

At least one of trimmed `title` or `content` must be non-empty. List ordering is
`updatedAt DESC, id DESC`. Search is case-insensitive across title and content
and always scoped by `userId` and archive state.

State transitions:

```text
draft in editor -> active saved note <-> archived saved note
```

Hard delete is outside v2.7.0.

## NoteTaskLink

| Field | Shape | Rules |
| --- | --- | --- |
| `id` | integer | Primary key |
| `noteId` | integer | Required, cascade with note |
| `taskId` | integer | Required, cascade with task |
| `createdAt` | datetime | Server generated |

`(noteId, taskId)` is unique. A link can only be created when both entities have
the authenticated `userId`. Removing a link never removes the note or task.

## AI task draft

Transient response, never persisted before confirmation:

| Field | Shape | Rules |
| --- | --- | --- |
| `title` | string | Required, 1–255 after user editing |
| `date` | `YYYY-MM-DD` or empty | Existing task contract |
| `priority` | string | Existing task option |
| `energyLevel` | `low`, `med`, `high` | Existing task option |
| `category` | string | Existing task limit |

Confirmation creates `Task` and `NoteTaskLink` atomically. The source fragment
is not stored in the link and must not be logged.

## Migration safety

The migration is additive: create two tables, foreign keys, unique constraint
and owner/list indexes; alter existing tables only through relation metadata in
the Prisma schema. It has no data backfill and no destructive statement. The
file is prepared locally only and is not applied in this task.
