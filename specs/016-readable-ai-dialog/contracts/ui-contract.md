# UI Contract: Понятный диалог Glowy AI

## Empty state

- Visible only when there are no persisted messages and no active response.
- Shows the Glowy role, concise explanation and exactly three starter actions.
- Activating a starter fills the existing textarea and focuses it.
- No network request or task mutation occurs until the user submits.

## Message

- User messages are labelled `Ты`; assistant messages are labelled `Glowy`.
- A valid `createdAt` is rendered as local `HH:mm`; missing/invalid values render no time.
- Copy remains available for message text.
- Assistant messages may include one linked-task result card.

## Linked task result

- Appears only after the existing explicit AI draft confirmation succeeds.
- Shows the saved title and a `Перейти к задачам` action.
- Navigates to the existing `/tasks` route and does not mutate the task.

## Clear confirmation

- Trigger remains in non-quick chat headers when local content exists.
- Confirmation copy states that local messages and unsaved drafts are removed, while tasks remain.
- `Отмена` closes confirmation without mutation.
- `Очистить` clears through the existing conversation store and resets transient typing state.
- The trigger is disabled while an AI response is pending.

## Jump to latest

- Becomes visible when the scroll container is not near its bottom.
- Activation scrolls to the bottom and returns auto-scroll to enabled state.
- Accessible name: `Перейти к новым сообщениям`.

## External contracts

`AiApi.parseMindHub`, task creation, auth, limits, backend responses and persistence outside the existing local conversation store remain unchanged.
