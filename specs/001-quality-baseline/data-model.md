# Data Model: Quality Baseline v2.1.0

## Database impact

This release does **not** create, alter or migrate production database tables. Existing Timeweb
PostgreSQL users, tasks, sub-tasks and payments are out of scope.

## Browser consent state

The existing consent value remains the authority for product analytics:

| Field | Meaning | Rule |
|-------|---------|------|
| `glowy_cookie_consent` | The browser's analytics choice | Only `accepted` permits product events. `rejected` or a missing value blocks them. |

## Product analytics event

| Field | Meaning | Validation |
|-------|---------|------------|
| `name` | A predefined product action | One of the allowlisted event names from the specification. |
| `utm_source` | Optional source of the first consented visit | Plain short source label only; no task, chat or account content. |
| `utm_campaign` | Optional campaign label | Plain short campaign label only. |
| `utm_content` | Optional creative label | Plain short creative label only. |

The event has no user ID, email, task title, AI request, message body, token, payment identifier or
other sensitive payload in frontend instrumentation.

## Structured error record

| Field | Meaning | Validation |
|-------|---------|------------|
| `level` | Severity | `error`, `warn` or `info`. |
| `event` | Stable error category | Short allowlisted identifier, not a raw user message. |
| `requestId` | Correlates a backend request and its response | Generated per request; not derived from user data. |
| `method` | HTTP method | Request metadata only. |
| `path` | Route pathname | Excludes query string and request body. |
| `statusCode` | HTTP result | Numeric response status. |
| `errorName` | Technical error class | No body or credentials. |

Error records are emitted to the existing application log destination and are not a new persistent
user-data store.
