# Contract: Task Completion Outcome

## Existing mutation

`PUT /api/tasks/:id`

Completion payload keeps the existing date contract:

```json
{
  "completed": true,
  "completedOn": "YYYY-MM-DD"
}
```

## Additive response

```json
{
  "task": {},
  "xpReward": -24,
  "xpOutcome": {
    "effect": "deducted",
    "amount": 24,
    "reason": "overdue_blocker"
  },
  "userProgress": {
    "xp": 96,
    "level": 1
  }
}
```

`xpReward` remains for compatibility and becomes a signed delta. `xpOutcome` is additive.

Allowed effects: `awarded`, `withheld`, `deducted`, `unchanged`. The response never contains the title or id of the blocking overdue task.

## Shared-channel invariant

HTTP, offline sync and Telegram completion must produce the same persisted XP/level for the same user, mode, tasks and completion date. A repeated mutation/callback never reapplies delta.
