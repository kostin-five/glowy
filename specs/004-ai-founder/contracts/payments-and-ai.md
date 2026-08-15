# Contracts: AI and Lifetime Plans

## AI service contract

`generateContentWithAiProvider(prompt, contextLabel)` and `chatWithAiProvider(request)` keep their current caller-facing signatures and return:

```json
{
  "text": "provider-neutral response",
  "providerUsed": "deepseek|gigachat|proxy",
  "modelUsed": "configured-model"
}
```

Failures expose stable internal codes and safe messages; credentials and raw provider bodies are not returned.

## GET /api/payments/current-plan

Existing Founder response:

```json
{
  "plan": "founder",
  "subscriptionStatus": "active",
  "planExpiresAt": null
}
```

Other plans retain their existing shape.

## POST /api/payments/forever/activate

When the Founder promotion is closed:

```json
{
  "code": "FOUNDER_PROMOTION_CLOSED",
  "error": "Промо-доступ Founder больше не оформляется"
}
```

Status: `403` for every caller while the promotion is closed. Existing Founder
users read their normalized plan through `GET /api/payments/current-plan`; this
legacy mutation endpoint never reactivates or changes an account while closed.

## POST /api/payments/forever/create

When paid Forever is disabled:

```json
{
  "code": "PAID_FOREVER_DISABLED",
  "error": "Тариф Forever пока недоступен для оформления"
}
```

Status: `403`. YooKassa is not called and no Payment row is created.
