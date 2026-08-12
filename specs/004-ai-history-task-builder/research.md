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

## Decision: optimistic draft versions plus atomic status claim

**Rationale**: Each update includes the last seen version. A conditional update rejects stale edits.
Confirmation first claims `pending -> confirming` inside the same transaction that creates the task,
so only one device wins and rollback restores the pending state on failure.

**Alternatives considered**: Last-write-wins silently loses edits. Client-only locks do not protect
against another browser or repeated HTTP requests.

## Decision: JSON snapshot for draft subtasks

**Rationale**: Draft subtasks are small (maximum ten), only accessed with their parent draft and do
not become real SubTask rows until confirmation. A validated ordered JSON snapshot minimizes schema
surface while keeping real tasks normalized.

**Alternatives considered**: A separate draft-subtask table adds joins and lifecycle operations with
no current query requirement.

## Decision: no automatic local-history import

**Rationale**: Existing text was created under a local-only expectation. Starting fresh avoids
unexpected transmission and duplicate reconciliation.

**Alternatives considered**: Automatic import violates the selected privacy behavior; an opt-in
import is deferred product scope.

