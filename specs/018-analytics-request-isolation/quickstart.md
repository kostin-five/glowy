# Validation

Installed local dependencies only; no backend, DB, real AI or production.
1. `npm run test -- src/pages/AnalyticsPage.test.tsx`: delayed account, period, retry, AI,
   guest transitions, pending duplicate lock, restored report, failed regeneration.
2. `npm run typecheck && npm run lint && npm run test && npm run build`.
3. `npm run test:e2e -- e2e/analytics-request-isolation.spec.ts`: mocked preview browser flows.
4. `npm run test:e2e`: existing restoration, offline and personal-progress regression.

Owner follow-up: real phone period change, retry and pending status. Do not trigger production
paid AI just for tests. Local browser tests do not imply physical-device or production acceptance.

## Evidence

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run test`: 58 files / 198 tests PASS (18 analytics page tests, including 15 new cases).
- `npm run build`: PASS; Playwright also rebuilt the preview.
- Focused browser suite: 4/4 PASS across both projects, with widths 320/360/390/430/1280.
- First full browser run: 121 passed, 6 failed, 1 intentionally skipped (desktop copy of a
  mobile-only personal-progress check). Failures: 3 desktop landing cases, desktop pricing,
  mobile habit creation timed out on navigation; desktop compact Notes timed out on a click.
- Read-only diagnosis reproduced a pending public Telegram SDK script while loading the pricing
  page. Other attempts loaded successfully. Do not label the separate Notes click timeout as
  conclusively caused by that SDK. No test, timeout or LandingPage changes made to hide failures.
- Full rerun with two workers (`npm run test:e2e -- --reporter=line --workers=2`):
  127 passed / 1 intentional skip, 0 failures. Test assertions/timeouts unchanged.
  This does not prove the external SDK risk is fixed; it is recorded as a separate roadmap item.
- Backend suite not rerun: frontend-only lifecycle/UI changes; API responses mocked, no DB/AI.
- Physical phone/production smoke not performed. No push, deploy, env, backups or migrations.
- Convergence: 10 FR, 4 SC, 8 acceptance scenarios, 5 design decisions and 5 constitution principles
  reviewed; no implementation gaps or new convergence tasks. The external SDK startup risk is outside
  this feature and remains documented in the roadmap. Git handoff uses a local focused commit/FF only.
