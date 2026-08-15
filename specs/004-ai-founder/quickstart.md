# Quickstart: v2.2.1 Verification

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e

cd backend
npm test
```

## Local provider configuration

Copy `backend/.env.example` to `backend/.env`, then provide server-only DeepSeek and GigaChat credentials. Do not put either key in a Vite variable.

Run backend and frontend. The separate proxy is not required for the direct path.

## Manual checks

1. Send a Mind Hub parse request and a chat request; verify both return through the backend.
2. Temporarily use an invalid DeepSeek URL or simulated 5xx and verify GigaChat answers once.
3. Use an existing lifetime account and verify Pricing and Settings show Founder with no expiry and 100 daily AI requests.
4. Use a Start account and verify the former Founder activation is rejected without changing the plan.
5. Verify paid Forever is unavailable in pricing and `POST /api/payments/forever/create` returns the disabled code.

## Operator-only completion

After automated checks, the user must configure real secrets in dev, smoke-test both providers, repeat on Timeweb, and only then remove the rollback proxy deployment. Paid Forever remains disabled until price and unit economics are approved.

The local implementation passed typecheck, lint, 57 frontend unit tests, 20
backend tests, production build, proxy syntax validation, and 12 Playwright
desktop/mobile scenarios on 2026-08-14. These checks do not replace calls with
real provider accounts.
