# Data Model: Мобильный Glowy AI

Схема backend и PostgreSQL не меняется. Ниже описано только frontend-состояние.

## ConversationMessage

- `id`: локальный уникальный идентификатор.
- `role`: `user | assistant`.
- `text`: текст текущего браузерного разговора.

**Validation**: при восстановлении принимаются только объекты с корректными `id`, `role` и
строковым `text`. Некорректные элементы отбрасываются.

## PendingMindHubDraft

- Все существующие поля `MindHubDraft`.
- `localId`: локальный стабильный идентификатор карточки до подтверждения или отказа.

**Lifecycle**:

```text
AI response -> pending -> edited -> confirmed -> removed
                           \-> dismissed -> removed
```

Черновик не является Task и не попадает в task store до `confirmed`.

## MindHubConversationState

- `messages`: текущие `ConversationMessage[]`.
- `pendingDrafts`: текущие `PendingMindHubDraft[]`.
- Actions: append/replace/clear messages, add/update/remove/clear drafts.

**Persistence**: только текущий браузер. Существующий ключ истории мигрируется без отправки данных
на сервер. Очистка истории очищает сообщения и pending drafts.

## MobilePanelState

- `closed`
- `ai`
- `more`

Состояния взаимоисключающие. Любая route change переводит состояние в `closed`.

## Existing entities reused

- `MindHubResponse`, `MindHubDraft`, `MindHubLimit` — без изменения API-контракта.
- `TaskDraft` / `Task` — создание только через `useTaskStore.createTask` после подтверждения.
- Auth session and plan limits — без изменения.
