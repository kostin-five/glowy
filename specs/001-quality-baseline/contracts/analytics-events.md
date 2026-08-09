# Contract: Product Analytics Events

## Purpose

Defines the only product events that frontend code may send to Yandex Metrika in v2.1.0.

## Consent precondition

The helper must do nothing unless the existing analytics consent value is `accepted` and the
Metrika counter has been initialized. Event delivery failure must never block product interaction.

## Allowed event names

| Event | Trigger |
|-------|---------|
| `landing_cta_click` | The visitor selects the primary landing call to action. |
| `signup_started` | The visitor intentionally begins registration. |
| `signup_completed` | Registration succeeds. |
| `first_task_created` | A user's first task is successfully created. |
| `first_ai_request` | A user's first successful AI request is initiated. |
| `ai_draft_confirmed` | A user explicitly confirms an AI draft. Reserved only; implementation begins with the v2.2 flow. |
| `focus_checkout_started` | A user starts the existing Focus checkout flow. |

## Allowed parameters

Only these optional campaign labels may accompany an event: `utm_source`, `utm_campaign`,
`utm_content`. The helper must discard unknown keys and empty values.

## Explicitly forbidden payloads

Never include email, user ID, payment ID, token, password, task title, category, task content,
AI prompt, AI response, chat history, voice content or raw URL query strings.
