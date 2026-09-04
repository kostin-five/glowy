# AGENTS.md - Glowy Repository Guide

Read this file before changing the repository. The binding project rules live in
`.specify/memory/constitution.md`; this guide supplies the day-to-day context and commands.

## Product and Scope

Glowy is currently a Russian-language AI task planner. Its central promise is calm planning: help a
person capture thoughts and choose a realistic next step using tasks and current energy.

- AI proposes answers or drafts; it never silently mutates user data.
- Do not change `src/pages/LandingPage.tsx` unless the request explicitly concerns the landing
  page.
- Keep user-facing text in Russian until the separately planned RU/EN localization feature
  explicitly introduces translated copy.
- Read `docs/product-roadmap.md` before proposing or implementing roadmap work. It is a working
  plan, not a public delivery-date promise.

## Repository Map

```text
src/                 React + TypeScript frontend
  api/               Axios API clients and auth/session helpers
  pages/             Route-level screens
  components/        Reusable UI components
  dashboard/         Dashboard-specific UI
  store/             Zustand client state
  types/             Shared frontend types
  utils/             Pure helpers and unit tests
backend/             Express API and Prisma access
  routes/            Thin HTTP handlers
  services/ai/       AI provider, Mind Hub, parser, and usage limits
  middleware/        Authentication and request middleware
  lib/prisma.ts      The single shared Prisma client source
  prisma/            Schema and migration history
ai-proxy/            Optional server-side AI provider proxy
docs/                Product, release, payment, and operational documentation
.specify/            Spec Kit workflow, templates, and Glowy constitution
```

## Local Commands

Run frontend commands from the repository root:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Run the backend independently:

```bash
cd backend
npm install
npm run serve
npm run test
```

The optional AI proxy is also independent:

```bash
cd ai-proxy
npm install
npm start
```

CI runs frontend typecheck, lint, unit tests, production build and Playwright checks, plus the
isolated backend HTTP test suite, on pull requests and pushes targeting `master` and `dev`.
Backend HTTP tests must stay database-free unless a separate test database is deliberately added.

## Implementation Conventions

- Inspect the relevant route, API client, store, component, service, and tests before editing.
  Reuse the local pattern instead of introducing a parallel abstraction.
- Frontend code is TypeScript. Keep API access in `src/api/`, shared client state in Zustand
  stores, and route composition in `src/pages/`.
- Backend source uses strict ESM TypeScript and compiles to `backend/dist/`. Keep routes focused on
  HTTP handling; put reusable AI logic in `backend/services/ai/` and data access behind the shared
  Prisma instance. NodeNext source imports keep emitted `.js` suffixes where required.
- The only Prisma source is `backend/lib/prisma.ts`. NodeNext TypeScript modules import it with an
  emitted `.js` specifier (for example `../lib/prisma.js`); that suffix does not identify a
  JavaScript source file. Never create another `PrismaClient` or database pool.
- Preserve the task-date frontend contract: `YYYY-MM-DD` or an empty string. Do not reintroduce
  locale-dependent dates into API payloads.
- Prefer existing Zod and Express validation patterns at input boundaries. Treat client input and
  provider payloads as untrusted.
- Keep changes small and readable. Do not mix a feature with unrelated cleanup, dependency churn,
  or mass formatting.

## Security, Data, and Production

- Never read, expose, commit, log, or paste `.env` values, credentials, tokens, passwords,
  connection strings, or private user text. Use the relevant `.env.example` file as the public
  configuration reference.
- Production database data is live. A schema change or migration requires explicit user approval
  and a confirmed Timeweb backup. Never run `prisma migrate reset` or `prisma db push` against
  production.
- Do not deploy, restart production services, enable payment entry points, or run destructive git
  commands without explicit user approval.
- Subscription, AI-limit, authorization, and payment verification rules belong on the backend.
  Reuse the existing YooKassa checkout/webhook flow and AI provider/proxy flow.
- Payment changes must retain provider verification, amount/currency/metadata checks, and
  idempotent webhook behavior.

## Workflow and Verification

For a small isolated fix, use: inspect -> implement -> run relevant checks -> summarize the diff.

For a new user-facing feature or a change involving multiple modules, data, AI, authentication,
payments, offline behavior, or deployment, use Spec Kit:

```text
$speckit-specify -> $speckit-clarify -> $speckit-plan -> $speckit-tasks
-> $speckit-analyze -> $speckit-implement -> $speckit-converge
```

- Explain intended edits before changing files.
- Scale verification to risk. Run `typecheck`, `lint`, tests, and build as applicable; add focused
  tests for changed business logic where the project supports them.
- Manually test the real path for auth, task mutation, AI, payment, or mobile UX changes.
- Report checks that were not run and why. Never hide a relevant failing check.
- Update docs when public behavior, environment configuration, operations, payments, AI behavior,
  or the roadmap materially changes.

## Git Collaboration

- The working tree can contain user changes. Read and preserve them; never revert unrelated work.
- Before synchronizing `dev`, inspect `git status`, fetch, the recent graph and branch relationship.
  Do not run a blind pull when local unpushed commits exist.
- Create each implementation block in a new `codex/*` branch from the verified local `dev`.
- Do not use `git reset --hard`, `git checkout --`, force pushes, or destructive cleanup without
  explicit user approval.
- Make focused commits only when requested. Include a concise summary, relevant verification, and
  known risks in the handoff.

## Useful References

- `.specify/memory/constitution.md` - non-negotiable project principles.
- `docs/handoffs/PROJECT_HANDOFF_2026-09-04.md` - latest local development state and next steps.
- `docs/handoffs/PROJECT_HANDOFF_2026-08-30.md` - last verified production release and infrastructure state.
- `docs/handoffs/NEXT_CHAT_PROMPT.md` - canonical bootstrap prompt for the next main developer.
- `README.md` - setup, environment variables, deploy, and payment overview.
- `docs/product-roadmap.md` - approved product direction and release boundaries.
- `docs/payments-live-checklist.md` - operational checklist for live YooKassa payments.
- `deploy/README.md` - VPS and deployment notes.
