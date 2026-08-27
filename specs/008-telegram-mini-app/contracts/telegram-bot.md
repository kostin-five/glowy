# Telegram Bot Interaction Contract

Only private chats are supported. Every main response contains a compact keyboard with
«Открыть Glowy» and relevant Mini App navigation. Unlinked commands never reveal personal data.

| Input | Behavior for linked user |
| --- | --- |
| `/start`, `/help`, `/app` | Purpose, command menu and Web App launch button |
| `/today` | Owned incomplete tasks for today + task screen button |
| `/tasks` | Bounded nearest incomplete tasks + task screen button |
| `/energy` | Current value + explicit fixed-value buttons + home button |
| `/progress` | Bounded existing progress summary + progress screen button |
| `/add [text]` | Existing AI task draft; save/cancel buttons; no Task before save |
| `/done` | Bounded owned incomplete tasks; choose, then confirm/cancel completion |
| `/ai [question]` | Existing AI provider/limit; no persisted entity; AI screen button |
| `/unlink` | Confirm, then revoke connection without deleting Glowy account |
| unknown/text | Pending flow if active, otherwise menu + Open button |
| voice | No STT; ask for text and offer Mini App |

For a valid but unlinked user, `/start` and `/help` explain that registration/login happens inside
Mini App and show «Открыть Glowy». Other commands reveal nothing and show the same button.

## Navigation buttons

Web App buttons use only configured `TELEGRAM_MINI_APP_URL` plus an allowlisted target key. Bot
responses support home, tasks, notes, AI, progress, analytics and settings. URLs contain no user id,
token, secret or one-use code.

## Mutation callbacks

```text
tg:save:<draft-uuid>
tg:cancel:<draft-uuid>
tg:done-pick:<task-id>
tg:done-confirm:<task-id>
tg:done-cancel:<task-id>
tg:energy:<0..100>
tg:unlink-confirm
tg:flow-cancel
```

- Every callback answers `callback_query`, verifies private actor/current connection/ownership and
  reloads current entity state.
- Picking a task shows a second confirm/cancel step and changes nothing.
- Confirming completion calls shared Task completion rules; repeated callbacks do not award XP or
  mutate twice.
- Selecting energy is the explicit confirmation of one concrete value and idempotently sets it.
- Full edit/delete, note editing, analytics and settings open Mini App instead of chat CRUD.

## AI and failure behavior

- `/add` and `/ai` use the existing authenticated plan-aware AI allowance and provider chain.
- `/add` produces a temporary normalised draft; `/ai` produces only a conversational response.
- Provider/network failure yields a calm retry message and no mutation.
- Pending ADD/AI flow expires after 10 minutes and always offers «Отменить».
- Logs contain controlled event/error codes only, never questions, task titles, reply text,
  callback data, identifiers, token or init data.
