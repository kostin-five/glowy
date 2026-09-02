# Migration Gate Contract

## Scope contract

- Baseline: 95 tracked `.js` files under `backend/` at feature start.
- Runtime/support: 46 files; tests: 49 files.
- Release target: 0 remaining tracked `.js` source files from this baseline.
- Explicit exclusion: `ai-proxy/server.js` and non-backend deployable components.
- `backend/dist/**` is ignored and never counted as source.

## Per-slice entry gate

1. Working tree and overlapping user changes are inspected.
2. Slice file list and affected domain are explicit.
3. Existing focused tests pass or a pre-existing failure is recorded.
4. No behavior, contract, schema or dependency change is bundled into a mechanical rename.

## Per-slice exit gate

1. Converted files use `.ts` and compile in strict mode.
2. Relative ESM imports resolve to emitted `.js` files.
3. Focused backend tests, backend typecheck and compiled build pass.
4. No new Prisma client, parallel auth/payment/AI/Telegram path, secret logging or broad suppression exists.
5. Rollback remains limited to the slice diff/commit.

## Milestone gate

After each high-risk domain and before release: all backend tests; frontend typecheck, lint, tests and build; relevant contract/smoke checks; explicit failure/risk report.

## Final release gate

1. Inventory reports 95/95 converted and zero undeclared backend `.js` sources.
2. Temporary mixed-JS compiler allowances are removed.
3. Production entrypoint builds to `backend/dist/server.js` and starts under plain Node.js.
4. CI-required repository checks pass and v2.9.0 API contracts are preserved.
5. Deployment and production changes remain pending explicit owner approval.

## Rollback contract

- Development slice: revert only the focused slice; rebuild and rerun its entry checks.
- Pre-production artifact: discard `dist` and rebuild the previous commit.
- Production release (only after separate approval): restore previous artifact/PM2 entrypoint. Database rollback is unnecessary because there is no schema/data migration.
