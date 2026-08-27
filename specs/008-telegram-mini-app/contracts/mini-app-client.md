# Telegram Mini App Client Contract

## Bootstrap route

`GET /telegram?target=<route-key>` is the only bot-facing web entry. Allowed route keys map to:

| Key | Route |
| --- | --- |
| `home` | `/dashboard` |
| `tasks` | `/tasks` |
| `notes` | `/notes` |
| `ai` | `/ai` |
| `progress` | `/stairs` |
| `analytics` | `/analytics` |
| `settings` | `/settings` |

Missing/unknown target becomes `home`; raw paths/URLs are never redirected.

## States

1. `initializing`: call Telegram `ready()`/`expand()` and show Russian loader.
2. `restoring`: send raw init data once to session endpoint.
3. `needs-auth`: show in-Mini-App login/register without visiting the website.
4. `authenticated`: hydrate the existing auth store and replace-navigate to mapped route.
5. `offline`: explain that initial verification needs a connection and offer retry.
6. `invalid-launch`: explain how to open Glowy from the bot; expose no product data.
7. `server-error`: calm Russian error and retry; never a white screen.

## Bridge behavior

- Apply Telegram theme and safe-area/content-safe-area values without overriding user theme outside
  Telegram.
- Show native BackButton when application history can go back; otherwise close/hide appropriately.
- Recalculate viewport CSS values on Telegram viewport events and keyboard changes.
- Payment, recovery and sensitive external URLs use native `openLink` after allowlist validation and
  a direct user action.
- No bot token, JWT, raw init data or Telegram numeric identifier enters localStorage, analytics or
  error logs.
