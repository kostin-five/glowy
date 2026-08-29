# Contract: пожизненный тариф Forever

## Current plan

Активный бессрочный пользователь получает:

```json
{
  "plan": "forever",
  "subscriptionStatus": "active",
  "planExpiresAt": null
}
```

Значение `founder` больше не возвращается актуальными API.

## Legacy free activation

`POST /api/payments/forever/activate` не меняет пользователя и возвращает HTTP `410 Gone`:

```json
{
  "error": "Бесплатная активация Forever больше недоступна",
  "code": "PLAN_UNAVAILABLE"
}
```

Отказ происходит до database mutation.

## UI

- Pricing card: `Forever`.
- CTA: disabled `Скоро`.
- Active lifetime label: `Активен бессрочно`.
- Premium access messages: `Focus или Forever`.
