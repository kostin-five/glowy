# Research: Quality Baseline v2.1.0

## Decision: Use a local React error boundary

- **Decision**: Add one reusable error boundary around route-level application content with a
  calm Russian recovery state and a retry action.
- **Rationale**: The app already uses lazy routes and a route loader but does not isolate rendering
  failures. A local boundary adds no runtime dependency and limits the blast radius of an error.
- **Alternatives considered**:
  - A full external error-tracking SDK: deferred because it requires a vendor decision, account and
    secret DSN.
  - Only `try/catch` in individual components: rejected because render failures bypass it and the
    coverage becomes inconsistent.

## Decision: Centralize analytics behind consent and an allowlist

- **Decision**: Create one frontend helper that reads the existing consent state, sends only a
  fixed list of event names and permitted campaign parameters, and is the sole place where
  `window.ym` is called outside of the current counter initialization.
- **Rationale**: CookieConsent already delays Yandex Metrika loading until acceptance. A helper
  prevents scattered direct calls and makes privacy review and tests possible.
- **Alternatives considered**:
  - Send analytics through the Glowy backend: rejected for this release because it adds data
    handling and a new operational responsibility without a product need.
  - Track all click payloads: rejected because tasks, chat texts and other user content must never
    enter analytics.

## Decision: Use native structured server logging with request IDs

- **Decision**: Add a small backend logger that emits structured records, a request ID middleware,
  and one global error handler. Existing routes are updated only where needed to preserve an error
  cause without logging bodies, credentials or personal text.
- **Rationale**: The backend currently has inconsistent `console.error` calls and no final global
  handler. Native JSON records avoid a new runtime package in a small release and are readable in
  Timeweb logs.
- **Alternatives considered**:
  - Add Pino now: deferred; it is valuable when the backend moves to TypeScript in v2.3.0, but it
    is not required to make logs structured and redacted in v2.1.0.
  - Log complete requests/responses: rejected because this can expose passwords, prompts and tasks.

## Decision: Split Express construction from the listener

- **Decision**: Export the configured Express application from a dedicated module and keep
  `server.js` responsible only for starting it.
- **Rationale**: This enables deterministic HTTP tests for health, CORS, CSRF and validation
  behavior without listening on a production port or using production data.
- **Alternatives considered**:
  - Test a live development server: rejected because it is slower, harder to isolate and can use
    accidental local credentials.
  - Add database-dependent test coverage immediately: deferred until a disposable
    `TEST_DATABASE_URL` or local Docker PostgreSQL workflow is approved.

## Decision: Extend the existing CI pipeline instead of adding a second pipeline

- **Decision**: Add production build validation to the current workflow and retain Playwright
  report artifacts on failure.
- **Rationale**: Typecheck, lint, unit and browser checks already belong to one workflow. A second
  pipeline would duplicate dependencies and make the release state harder to understand.
- **Alternatives considered**:
  - Run all checks on every remote feature-branch push: deferred; pull requests to `dev` and
    `master` are the release gate, while developers retain the same local commands.

## Decision: Treat performance as measurement before optimization

- **Decision**: Record current build output and inspect the real mobile public path; only address
  a reproducible bottleneck found by those checks.
- **Rationale**: The app already lazy-loads routes. A broad performance rewrite without evidence
  would expand scope and risk regressions.
- **Alternatives considered**:
  - Premature library replacement or mass code splitting: rejected as unrelated cleanup.
