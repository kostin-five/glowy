# Data Model: AI Providers and Founder Plan

## Persistence

No database schema changes are required.

### Existing User entitlement

- `plan`: existing internal key (`start`, `focus`, `forever`)
- `subscriptionStatus`: entitlement state
- `planExpiresAt`: null for lifetime access
- Founder classification: `plan = forever`, active status, no expiry, and no successful paid Forever payment

### Existing Payment

- `plan`: `focus` or future `forever`
- `amountKopeks`, `currency`: verified against server-owned configuration
- `paid`, `status`: used to distinguish a future paid lifetime entitlement from a promotional Founder

## Ephemeral runtime state

### GigaChat token cache

- Access token string
- Expiry timestamp
- Never persisted or logged
- Cleared on authentication failure or provider 401

### Normalized AI result

- Text
- Provider used
- Model used

### Normalized AI failure

- Stable internal code
- Safe message
- HTTP status
- Retryable/fallback-eligible boolean
- Original cause retained only in process memory for structured logging
