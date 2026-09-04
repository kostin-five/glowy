# Implementation Plan: Documentation handoff refresh

## Summary

Reconcile active documentation around three explicit layers: historical context, last verified
production and current local development. Replace the obsolete v2.9.0 chat prompt with a canonical
next-chat prompt and link it from onboarding and the latest handoff.

## Constitution check

- User control: PASS — documentation-only work.
- Existing architecture: PASS — documents record the current architecture; no parallel flow.
- Data/secrets: PASS — no `.env` values or user data are read or copied.
- Verification: PASS — targeted consistency scans, path checks and diff checks.
- Collaboration: PASS — small dedicated branch and focused commit.

## Files in scope

- `AGENTS.md`, `.specify/memory/constitution.md`, `README.md`
- `docs/architecture.md`, `docs/product-roadmap.md`
- active/historical handoff headers and `docs/handoffs/DEVELOPER_ONBOARDING.md`
- `deploy/README.md`, `backend/README.md`, `ai-proxy/README.md` if their active guidance conflicts
- canonical `docs/handoffs/NEXT_CHAT_PROMPT.md`

## Rollback

Revert the documentation commit. No data, generated artifact, environment or service rollback is
required.
