# Contract: Profile Behavior Mode

Existing preferences read/update shapes remain compatible.

## Values

```text
calm | moderate | strict
```

## User-visible semantics

- `calm`: default; supportive AI; normal XP; ordinary date styling.
- `moderate`: neutral/direct AI; another overdue task withholds XP for a current task; ordinary date styling.
- `strict`: demanding/respectful AI; another overdue task deducts XP for a current task; overdue date is red.

All modes are reversible. The server validates the value and enforces Focus/Founder entitlement exactly as before.

## Safety invariant

Strict responses may criticize the missed action and require a decision. They must not insult, shame, threaten, discriminate, diagnose, exploit vulnerability or assess the user's worth.
