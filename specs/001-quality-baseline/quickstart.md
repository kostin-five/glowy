# Quickstart: Validate Quality Baseline v2.1.0

## Prerequisites

- Root dependencies installed with `npm install`.
- Backend dependencies installed with `cd backend && npm install` when validating backend changes.
- No production credentials or Timeweb database connection are needed for frontend checks or
  backend health/CORS tests.

## Required local checks

Run from the repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Expected result: all commands finish successfully; the browser suite opens the public entry point
for desktop Chromium and a mobile viewport.

## Manual validation

1. Open the public route at desktop width and at 360, 390 and 430 px widths.
2. After an approved CTA instrumentation change, accept analytics cookies, follow a UTM-marked
   primary CTA, and confirm that only the allowed
   event name and campaign labels are visible in the analytics debugger.
3. Repeat after rejecting analytics cookies and confirm product actions still work while no
   product event is sent.
4. Trigger a controlled component failure in a local development-only check and verify that the
   recovery UI keeps the rest of the application usable.
5. Call the backend health endpoint and a rejected-origin request locally; confirm that the
   response and structured diagnostic record follow [error-logging.md](contracts/error-logging.md).

## CI validation

Open a pull request to `dev` or `master`. The GitHub Actions workflow must pass typecheck, lint,
unit tests, production build and Playwright tests. On a browser failure, download the
`playwright-report` artifact for diagnostics.

## Out of scope checks

Do not run migrations, `prisma db push`, production deploys or payment activation as part of this
feature. Database-dependent backend tests require a separate test database before they are added.
