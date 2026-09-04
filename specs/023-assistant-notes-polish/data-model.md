# Data Model

Новых сущностей и полей нет.

## Existing Note

- `id`, `title`, `content`, `archived`, `createdAt`, `updatedAt`
- `taskLinks` — существующие связи с задачами

Состояния и переходы остаются прежними: новая/существующая, активная/архивная, clean/dirty/saving/saved/error. Визуальный контекст читает эти данные, но не создаёт отдельную копию.

