# Contract: Progress Calendar and Rescue

## Overview request

`GET /api/progress?today=YYYY-MM-DD&month=YYYY-MM`

- `month` is optional and defaults to the month of `today`.
- A future or malformed month returns `400`.

## Additive overview shape

Existing overview fields remain. `taskStreak.calendar` adds `month`, `from`, `to`, navigation flags and 35–42 day entries with state `active | rescued | missed | today | future | empty`.

## Rescue mutation

`POST /api/progress/rescues`

```json
{
  "protectedOn": "YYYY-MM-DD",
  "today": "YYYY-MM-DD",
  "month": "YYYY-MM"
}
```

The server accepts only `protectedOn = today - 1`, only when `today - 2` belongs to the continuous activity/rescue set and yesterday is absent. Duplicate/exhausted remains `409`; any other date or broken pre-streak returns `400`. Success returns the same selected calendar month.
