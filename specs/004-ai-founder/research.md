# Research: AI Providers and Founder Plan

## Decision 1: Provider routing

- **Decision**: DeepSeek is primary. GigaChat is called once only after network failure, timeout, HTTP 429, or HTTP 5xx.
- **Rationale**: These failures are likely temporary or capacity-related. Falling back after validation, authentication, or other 4xx failures can hide configuration defects and duplicate invalid requests.
- **Alternatives rejected**: Parallel racing wastes paid requests and can create inconsistent answers. Retrying the same provider before fallback adds latency during peak load.

## Decision 2: Common message format

- **Decision**: Convert existing Gemini-style history at the provider boundary into OpenAI-compatible `system`, `user`, and `assistant` messages used by both direct providers.
- **Rationale**: Existing callers remain stable while provider-specific payloads stay inside one service.
- **Alternatives rejected**: Rewriting all AI call sites would broaden the release and make provider details leak into business services.

## Decision 3: GigaChat authentication

- **Decision**: Request OAuth access tokens with the server-only authorization key, UUID request identifier, and configured scope. Cache the token in memory until a safety window before provider expiry; invalidate and retry authentication once after a chat 401.
- **Rationale**: GigaChat access tokens are short-lived, and per-request authentication adds latency and load.
- **Alternatives rejected**: Persistent token storage is unnecessary for an ephemeral credential and would require extra security and migration work.

## Decision 4: Lifetime plan compatibility

- **Decision**: Keep `forever` as the internal database entitlement key. Present active non-expiring legacy lifetime access as `founder` in plan APIs and UI. Continue using `forever` internally for AI limits.
- **Rationale**: This preserves existing users and avoids a production migration.
- **Alternatives rejected**: Renaming stored values requires a migration; adding a new entitlement column is outside approved scope.

## Decision 5: Promotion and paid plan controls

- **Decision**: Keep the legacy activation route for compatibility but reject new activation when `FOUNDER_SIGNUP_ENABLED` is not explicitly true. Add paid Forever to the shared plan configuration and reject checkout unless `PAID_FOREVER_ENABLED=true`.
- **Rationale**: Server flags protect the commercial boundary even if an old frontend or direct API caller remains.
- **Alternatives rejected**: Frontend-only disabling is bypassable; deleting the endpoint immediately produces an opaque 404 for old clients.

## Decision 6: Proxy retirement

- **Decision**: Direct backend calls become the normal path. The proxy is made provider-neutral and Gemini-free as a rollback option, then removed only after user-run dev and Timeweb smoke tests.
- **Rationale**: Real credentials and infrastructure are unavailable to the coding agent, so immediate deletion would remove the rollback before operational verification.
- **Alternatives rejected**: Keeping Gemini code violates the release goal; deleting the proxy before smoke tests violates the roadmap rollout rule.
