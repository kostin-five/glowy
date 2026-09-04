# Feature Specification: Documentation handoff refresh

**Feature Branch**: `codex/documentation-handoff-refresh`

**Created**: 2026-09-04

**Status**: Approved by direct user request

**Input**: Refresh all active Glowy documentation and prepare a reliable prompt for a new main-developer chat.

## Clarifications

- No blocking ambiguity remains. “All documentation” means active sources of truth, onboarding,
  run/deploy guidance and the handoff prompt. Historical release notes and completed specifications
  remain historical and are not rewritten to pretend their old paths or plans were current.
- Production truth and local-development truth must be stated separately. A Git ref does not prove
  what is deployed.
- The new prompt must not prescribe a blind pull because local `dev` contains unpushed work.

## User scenarios

### US1 — A new developer understands the real state (P1)

After reading the mandatory documents, a developer can distinguish production v2.8.0 from the
newer local work, identify the current TypeScript backend and avoid unsafe infrastructure actions.

**Acceptance**: no active document calls v2.9.0 the next unstarted release or describes the main
backend as JavaScript.

### US2 — A new chat starts safely (P1)

The owner can paste one prompt into a new chat. The agent first reads the canonical documents,
performs read-only Git checks and waits for a concrete task.

**Acceptance**: the prompt includes the 2026-09-04 handoff, TypeScript/Prisma rules, current local
state, production boundaries, verification rules and a safe branch workflow.

### US3 — Historical context remains trustworthy (P2)

Old handoffs and release notes preserve what was true at their date, while a prominent notice points
to the current source of truth.

## Requirements

- **FR-001**: Active docs MUST identify v2.8.0 / `97af6f6` as the last owner-verified production state.
- **FR-002**: Active docs MUST identify local `dev` as newer and not pushed/deployed.
- **FR-003**: Backend docs MUST describe strict ESM TypeScript compiled to `backend/dist/`.
- **FR-004**: Prisma documentation MUST distinguish source file `backend/lib/prisma.ts` from emitted
  `.js` import specifiers used by NodeNext.
- **FR-005**: AI docs MUST describe direct DeepSeek with GigaChat fallback and `ai-proxy` as an
  optional rollback component.
- **FR-006**: Git instructions MUST start with read-only status/fetch/log/relationship checks and
  MUST NOT discard local unpushed commits.
- **FR-007**: The prompt MUST require no edits until the owner sends a concrete task.
- **FR-008**: No application code, schema, migration, environment or production state may change.

## Success criteria

- **SC-001**: Targeted stale-state search returns no active contradictions outside explicitly
  historical documents/specifications.
- **SC-002**: Markdown links and referenced paths in updated active documents exist locally where
  applicable.
- **SC-003**: `git diff --check` passes and the diff contains documentation/spec artifacts only.

## Out of scope

- Product code, UI, tests, database schema, environment configuration, deploy and push.
- Rewriting historical specifications or release notes to use present-day filenames.
