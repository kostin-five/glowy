# Telegram Bot Interaction Contract

Only private chats are supported. All messages are Russian and avoid technical details.

| Input | Unlinked user | Linked user |
| --- | --- | --- |
| `/start` | Purpose + link instructions | Welcome + command list |
| `/start <code>` | Atomically consume code or explain invalid/expired | Reject replacement; ask to unlink first |
| `/help` | Safe link help | Command list and confirmation rule |
| `/today` | No data; link instruction | Current incomplete tasks or calm empty state |
| `/energy` | No data; link instruction | Current value + buttons 20/40/60/80/100 |
| `/add <text>` | No processing | Generate one pending AI draft |
| `/add` | No processing | Prompt for next text for up to 10 minutes |
| plain text after `/add` | No processing | Generate one pending AI draft |
| voice | Link instruction | No STT/task; ask to send text (v2.8.1 boundary) |
| `/unlink` | Already disconnected | Delete connection and confirm |

## Draft callbacks

Callback data stays below Telegram's limit and contains action plus opaque UUID:

```text
tg:save:<draft-uuid>
tg:cancel:<draft-uuid>
tg:energy:<0..100>
```

Every callback checks sender, current connection, draft owner/status/expiry. The bot calls
`answerCallbackQuery` promptly. Save creates one Task and disables buttons; cancel/expiry creates
none. A callback belonging to another user receives a generic rejection without draft text.

## AI and failure behavior

- `/add` previews the existing authenticated AI limit before provider use and consumes the same
  allowance only through current AI-limit services.
- An exhausted limit returns the existing plan-aware state without a fallback-provider bypass.
- Provider/network failure produces a calm retry-later message and no persistent task.
- Telegram send failure is retryable, but a confirmed task is not recreated; the terminal draft
  remains the idempotency source.

