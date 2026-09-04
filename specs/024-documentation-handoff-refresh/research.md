# Research: Documentation handoff refresh

## Decision 1 — Separate deployed and repository state

**Decision**: retain the owner-verified production marker (`v2.8.0`, `97af6f6`) independently from
local `master`, `origin/master` and `dev` refs.

**Reason**: repository refs can advance without a Timeweb deploy.

## Decision 2 — Do not rewrite history

**Decision**: add archive/current-source notices to old handoffs; preserve dated facts and old paths
inside completed release specifications.

**Reason**: historical docs must remain auditable.

## Decision 3 — Safe Git bootstrap

**Decision**: require `status`, `fetch`, `log` and relationship checks before creating a branch.
Pull/merge is allowed only after the developer explains the observed relation and preserves local
unpushed work.

**Reason**: current local `dev` is ahead of `origin/dev`.

## Decision 4 — Canonical prompt

**Decision**: replace the version-specific v2.9.0 prompt with `NEXT_CHAT_PROMPT.md`.

**Reason**: onboarding should not become obsolete every time the autonomous queue advances.
