# UI Contract: Мобильный Glowy AI

## Mobile navigation

Visible only below the existing `lg` breakpoint.

| Position | Label | Action | Active state |
|---|---|---|---|
| 1 | Главная | Navigate `/dashboard` | Route is `/dashboard` |
| 2 | Задачи | Navigate `/tasks` | Route starts with `/tasks` |
| 3 | Glowy AI | Open AI bottom sheet | Sheet open or route `/ai` |
| 4 | Мой прогресс | Navigate `/stairs` | Route is `/stairs` |
| 5 | Ещё | Open More bottom sheet | More sheet open or route is analytics/settings |

## AI bottom sheet

- Modal dialog with Russian accessible name.
- Opens over the current route without navigation.
- Contains compact `MindHubChat` and action «Открыть полный чат».
- Close: explicit button, backdrop, Escape or route change.
- Only one instance may be open.
- Uses the same conversation state and Task confirmation path as `/ai`.

## More bottom sheet

- Modal dialog with Russian accessible name «Ещё».
- Links: «Аналитика» → `/analytics`, «Настройки» → `/settings`.
- Link activation closes the sheet before/with navigation.

## Full chat route

- `GET /ai` at the client router level.
- Protected by the existing auth guard and wrapped in `AppLayout`.
- Displays full-height `MindHubChat` variant.
- No new backend endpoint.

## SVG orb

- Native `button` with accessible name «Открыть Glowy AI».
- SVG is decorative (`aria-hidden`).
- Visible focus state and minimum 56×56 px hit area.
- Continuous animation disabled by `prefers-reduced-motion`.

## AI and task boundary

The existing API contract remains:

```json
{
  "reply": "string or null",
  "drafts": [],
  "limit": "optional existing limit object"
}
```

Neither surface writes tasks on response. Only explicit confirmation invokes the existing Task API.
