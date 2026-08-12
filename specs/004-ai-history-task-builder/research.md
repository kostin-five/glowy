# Research: Серверная история Glowy AI

## Decision: one server conversation per registered user

**Rationale**: The roadmap explicitly rejects multiple named chats at this stage. A unique owner
relationship gives simple authorization and consistent quick/full-chat behavior.

**Alternatives considered**: Named conversations and per-device histories were rejected as extra
product scope and a source of fragmented context.

## Decision: persist completed exchanges and reserve by client request ID

**Rationale**: A server exchange represents one user message and its AI result. Reserving a unique
client request ID before provider work prevents duplicate persisted turns and makes retries explicit.
Only completed exchanges appear in history; failed reservations are removed.

**Alternatives considered**: Independent message inserts risk half-turns. Saving only after AI makes
concurrent duplicate provider requests and duplicate limit accounting harder to control.

## Decision: cursor pagination and bounded AI context

**Rationale**: Cursor pagination remains stable while new exchanges arrive. Twenty exchanges are
returned per UI page; the provider receives at most the latest twenty messages to bound cost.

**Alternatives considered**: Offset pagination can skip/duplicate rows during concurrent inserts.
Sending the entire history grows cost and latency without bound.

## Decision: no automatic local-history import

**Rationale**: Existing text was created under a local-only expectation. Starting fresh avoids
unexpected transmission and duplicate reconciliation.

**Alternatives considered**: Automatic import violates the selected privacy behavior; an opt-in
import is deferred product scope.

## Decision: history synchronization is non-blocking

**Rationale**: Existing chat, voice input, local drafts and explicit task creation are already useful
independently. A missing migration, temporary database failure or unavailable history endpoint must
disable only cross-device synchronization. The UI keeps local state and shows a small status notice;
the backend still returns a successful provider response if history persistence alone fails.

**Alternatives considered**: Blocking the composer until history loads was rejected because it made
an additive feature a single point of failure and caused the regression observed during local setup.
