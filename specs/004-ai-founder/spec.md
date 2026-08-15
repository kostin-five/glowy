# Feature Specification: AI Providers and Founder Plan

**Feature Branch**: `codex/v2.2.1-ai-founder`

**Created**: 2026-08-14

**Status**: Implemented locally; operator rollout pending

**Input**: Implement roadmap release v2.2.1: direct DeepSeek with GigaChat fallback, remove Gemini from active code, rename the free lifetime offer to Founder, close free activation, and keep paid Forever disabled.

## User Scenarios & Testing

### User Story 1 - Reliable AI response (Priority: P1)

A user sends a request to Glowy and receives one response from the primary AI provider. If that provider is temporarily unavailable, Glowy retries the same request once through the configured fallback without duplicating a successful request.

**Why this priority**: AI assistance is the product's key distinction and must remain available without exposing provider details or secrets to the browser.

**Independent Test**: Simulate primary success, primary temporary failure, and permanent client failure; verify which providers are called and what the user receives.

**Acceptance Scenarios**:

1. **Given** the primary provider is available, **When** a user sends an AI request, **Then** the primary provider answers and the fallback is not called.
2. **Given** the primary provider times out, has a network failure, returns rate limiting, or a server error, **When** a user sends an AI request, **Then** Glowy calls the fallback once and returns its response.
3. **Given** the primary provider rejects an invalid request, **When** a user sends an AI request, **Then** Glowy does not call the fallback and returns a safe error.
4. **Given** either provider answers successfully, **When** the response reaches the browser, **Then** no provider credential or internal provider payload is exposed.

---

### User Story 2 - Existing lifetime users become Founders (Priority: P2)

An existing user with the free lifetime plan sees it called Founder and retains active lifetime access and the existing AI allowance.

**Why this priority**: Early users must keep the benefit they were promised while the public offer changes.

**Independent Test**: Load pricing, settings, and plan APIs for an existing lifetime user and verify Founder status, no expiry, and unchanged AI allowance.

**Acceptance Scenarios**:

1. **Given** a user already has active lifetime access, **When** they open pricing or settings, **Then** the current plan is shown as Founder and remains active without an expiry date.
2. **Given** a Founder uses AI, **When** usage is calculated, **Then** the daily limit remains 100.
3. **Given** a Founder opens pricing, **When** Focus is displayed, **Then** Focus cannot be purchased over the active lifetime plan.

---

### User Story 3 - Free lifetime activation is closed (Priority: P2)

A user who does not already have lifetime access cannot claim Founder for free after the promotion closes.

**Why this priority**: Leaving the endpoint open would continue granting an offer that has ended.

**Independent Test**: Call the former activation flow as a new authenticated user and verify that no plan state changes.

**Acceptance Scenarios**:

1. **Given** the Founder promotion is closed, **When** a new or Start user attempts activation, **Then** the server rejects it and preserves their current plan.
2. **Given** the Founder promotion is closed, **When** a guest views pricing, **Then** the UI does not offer a free Founder activation.

---

### User Story 4 - Future Forever checkout is safely staged (Priority: P3)

The product can contain configuration and payment rules for a future paid Forever plan, while users cannot start that checkout until a backend flag is explicitly enabled.

**Why this priority**: The paid offer must not go live before unit economics and operational checks are complete.

**Independent Test**: With the server flag disabled, attempt the Forever checkout and verify that no YooKassa payment is created.

**Acceptance Scenarios**:

1. **Given** paid Forever is disabled, **When** an authenticated user tries to create its checkout, **Then** the server rejects the request before contacting YooKassa.
2. **Given** paid Forever is disabled, **When** pricing is opened, **Then** the plan is visibly unavailable and cannot be clicked.

### Edge Cases

- The primary provider returns an empty or malformed success response.
- The fallback provider token expires between authentication and chat requests.
- Both providers are temporarily unavailable.
- GigaChat authentication fails and must not be retried as a chat request.
- A legacy lifetime holder has `plan = forever`, active status, and no expiry but no payment row.
- A user has a successful future Forever payment; the system must not mislabel that paid entitlement as Founder.
- The browser calls the removed free activation endpoint directly.

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST call DeepSeek directly as the primary AI provider.
- **FR-002**: The backend MUST use GigaChat as fallback only for timeout, network, rate-limit, and provider server failures.
- **FR-003**: The system MUST NOT send a request to both providers when the primary request succeeds.
- **FR-004**: Provider credentials and access tokens MUST remain server-side and MUST NOT be logged.
- **FR-005**: GigaChat access tokens MUST be cached in memory and refreshed before or after expiry as needed.
- **FR-006**: Active code and active configuration MUST NOT require Gemini.
- **FR-007**: User-facing AI errors MUST remain provider-neutral and distinguish retryable temporary failure from non-retryable configuration or request failure.
- **FR-008**: Existing free lifetime users MUST retain active access without an expiry and a 100-request daily AI limit.
- **FR-009**: Existing free lifetime access MUST be labeled Founder in user-facing plan responses and screens.
- **FR-010**: The former free lifetime activation route MUST reject new activation when the Founder promotion is closed.
- **FR-011**: The future paid Forever checkout MUST reuse the existing YooKassa payment flow and remain disabled by a backend feature flag.
- **FR-012**: With paid Forever disabled, the backend MUST reject checkout before creating a provider payment.
- **FR-013**: The release MUST NOT add or apply a Prisma migration.
- **FR-014**: Environment examples and operational documentation MUST describe direct provider configuration and the required release flags without secret values.
- **FR-015**: Server-side dialog history and configurable communication tones MUST remain outside this release.

### Key Entities

- **AI provider request**: Provider-neutral prompt or chat request, generation settings, context label, chosen provider, and result metadata.
- **Provider failure**: Normalized code, retryability, HTTP status, and safe message used to decide fallback behavior.
- **Lifetime entitlement**: Existing active non-expiring plan stored with the legacy internal key and represented to users as Founder unless backed by a successful paid Forever payment.
- **Payment plan configuration**: Server-owned amount, currency, description, expiry policy, and enablement flag used by the shared YooKassa flow.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Automated tests prove the fallback is called exactly once for each eligible primary failure and zero times after primary success or client errors.
- **SC-002**: All backend tests pass without Gemini credentials, SDK, or proxy service running.
- **SC-003**: Existing lifetime users see Founder in pricing, settings, and current-plan responses while retaining 100 AI requests per day and no expiry.
- **SC-004**: Direct calls to the former free activation and disabled paid Forever checkout create zero plan changes and zero provider payments.
- **SC-005**: Typecheck, lint, frontend tests, backend tests, and production build pass before handoff.

## Assumptions

- The legacy database value `forever` remains unchanged in this release to avoid a migration.
- A legacy active non-expiring `forever` user without a successful paid Forever payment is a Founder.
- DeepSeek remains the primary provider and GigaChat uses the account scope supplied through backend environment configuration.
- Live provider credentials, dev/Timeweb deployment, and real YooKassa enablement are operator tasks and are not performed by the coding agent.
- The AI proxy is retained only as an optional rollback path until direct provider smoke tests pass; all Gemini-specific behavior is removed from it during this release.
