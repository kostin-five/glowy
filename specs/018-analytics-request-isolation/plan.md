# Implementation Plan: Analytics request isolation

**Branch**: `codex/analytics-request-isolation` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

## Summary

Key the existing AnalyticsPage view by account/guest, period and anchor date so scope changes
synchronously discard snapshot, errors, modal and loading state. Guard asynchronous retry/insight
completion against that lifetime, including localStorage writes. Preserve API/report storage.
Show pending AI status, disable delete/regenerate while pending, use immediate ref lock for duplicates.

## Technical Context

TypeScript, React, Zustand auth, existing Axios AnalyticsApi and Recharts. Browser web/PWA/Telegram;
Vitest/Testing Library plus Playwright with mocked API. Existing localStorage report format retained.
Scope: one page, regression tests and documentation. No dependency, backend, DB or external changes.
Performance: one snapshot request per mounted scope in normal production rendering; no polling.
Development StrictMode may replay the initial effect; obsolete completions must be ignored.

## Constitution Check

Pre/post design: PASS all five principles. Calm Russian feedback; no silent AI mutations;
no tariff/backend authority changes; reuse account/API/storage; database-free verification;
no production, user texts, LandingPage or brand edits.

## Project Structure

- `src/pages/AnalyticsPage.tsx`: keyed view, lifetime guards, loading feedback.
- `src/pages/AnalyticsPage.test.tsx`: delayed account/period/retry/AI promises, guest/report behavior.
- `e2e/analytics-request-isolation.spec.ts`: mocked browser retry and AI pending flow.
- `specs/018-analytics-request-isolation/`: spec, plan, research, model, contracts, tasks, quickstart.
- `docs/product-roadmap.md`: bounded local status, not a full analytics redesign claim.

## Implementation phases

1. Inspect contracts/ignore files; regression tests.
2. US1 account scope and ignored abandoned completions.
3. US2 period/date scope and retry isolation.
4. US3 pending/duplicate safeguards and old report preservation.
5. Full frontend/browser gates and convergence.

## Rollback

Revert this isolated commit via follow-up commit. No storage format, schema or migration changes.
Ignoring a response does not refund server-side AI usage.
