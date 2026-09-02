# Quickstart: Backend TypeScript Migration

## Safety preflight

```bash
git status --short --branch
git diff --check
git ls-files 'backend/**/*.js' 'backend/*.js'
```

Do not read `.env` files. Do not run Prisma migration/deploy commands. Do not deploy or alter Timeweb/PM2 during implementation.

## Foundation target

```bash
cd backend
npm run typecheck
npm run build
```

`typecheck` validates without emit; `build` recreates ignored `dist/` as Node.js ESM. During mixed-state slices JavaScript is copied by TypeScript; final release removes that allowance.

## Slice workflow

1. Record explicit files and baseline focused test.
2. Rename only those files from `.js` to `.ts`.
3. Add narrow types and boundary validation without behavior changes.
4. Run backend typecheck/build and focused tests.
5. Inspect for runtime changes, secrets, broad `any`, duplicate Prisma clients and import mistakes.
6. Keep the slice independently revertible.

## Verification commands

```bash
cd backend
npm run typecheck
npm run build
npm run test
npm run inventory:check

cd ..
npm run typecheck
npm run lint
npm run test
npm run build
```

Run relevant Playwright/contract smoke tests at high-risk milestones. Never paste private payloads or initData into fixtures or logs.

## Final inventory

```bash
cd backend
npm run inventory:check
```

Expected: `95/95 converted` and no backend JavaScript source. `ai-proxy/server.js` is a separate
rollback component outside this gate.

## Production handoff

Provide the exact `backend/dist/server.js` entrypoint, verification/risk summary, rollback instructions and an explicit note that deployment still requires owner approval.
