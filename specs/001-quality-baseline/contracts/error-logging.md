# Contract: Backend Error Logging

## Purpose

Defines the minimum safe diagnostic record for backend failures in v2.1.0.

## Request correlation

Every backend request receives a server-generated request ID. It may be returned in a response
header so a user report can be connected to a Timeweb log entry. It must not be accepted from the
client as the authority.

## Error record requirements

An error record contains a stable event name, request ID, HTTP method, route pathname, response
status and error class. Production logs use a structured representation; development remains
human-readable while keeping the same redaction rules.

## Redaction rules

Logs must not contain request body, authorization header, cookies, password, JWT, YooKassa
credentials, database URL, AI key, task content, AI prompt or AI response. Query strings are
omitted from the logged path.

## Response behavior

Unexpected errors return a generic Russian error response. Internal technical context stays in the
server log only. Existing explicit route responses remain unchanged unless they leak sensitive
details.
