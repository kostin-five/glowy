# Tasks: Единый пожизненный тариф Forever

**Input**: `specs/011-forever-unification/`
**Tests**: обязательны billing/payment/frontend/e2e regressions.

## Phase 1: Setup and Guards

- [x] T001 Record current branch/status and baseline in `specs/011-forever-unification/quickstart.md`
- [x] T002 Confirm `backend/prisma/schema.prisma`, `src/pages/LandingPage.tsx` and Focus checkout/webhook have no feature diff
- [x] T003 [P] Inventory non-archived Founder references in `backend/`, `src/`, current docs and env examples

## Phase 2: Foundational lifetime contract

- [x] T004 [P] [US1] Update entitlement service tests to expect public `forever` in `backend/services/billing/plan-entitlements.service.test.js`
- [x] T005 [US1] Remove Founder alias while preserving active lifetime detection in `backend/services/billing/plan-entitlements.service.js`
- [x] T006 [P] [US1] Simplify Forever AI-plan expectations without changing limit 100 in `backend/services/ai/ai-limits.service.test.js`
- [x] T007 [US1] Remove public Founder mapping from `backend/services/ai/ai-limits.service.js`

## Phase 3: User Story 2 — Close free activation (P1)

- [x] T008 [P] [US2] Add 410/no-database-mutation route coverage in `backend/test/payment-feature-flags.test.js`
- [x] T009 [US2] Replace free activation handler with controlled 410 response in `backend/routes/payment.routes.js`
- [x] T010 [P] [US2] Remove lifetime activation client and adjust Pricing test in `src/api/PaymentApi.ts` and `src/pages/PricingPage.test.tsx`
- [x] T011 [US2] Verify Pricing remains disabled Forever preview in `src/pages/PricingPage.tsx` and `e2e/pricing.smoke.spec.ts`

## Phase 4: User Story 3 — One current name (P2)

- [x] T012 [P] [US3] Replace current frontend Founder labels/types with Forever in `src/pages/SettingsPage.tsx`, `src/pages/AnalyticsPage.tsx`, `src/pages/OfferPage.tsx`, `src/pages/TermsOfServicePage.tsx`, `src/components/profile/ProfilePreferencesPanel.tsx`, `src/api/AiApi.ts`
- [x] T013 [P] [US3] Replace current backend access messages and env comments with Forever in `backend/routes/analytics.routes.js`, `backend/routes/user.routes.js`, `backend/.env.example`
- [x] T014 [US3] Reconcile current architecture, roadmap and unit-economics docs in `docs/architecture.md`, `docs/product-roadmap.md`, `docs/ai-unit-economics.md`
- [x] T015 [US3] Add an automated guard against current Founder references while excluding archived release notes in `backend/test/forever-terminology.test.js`

## Phase 5: Polish and Verification

- [x] T016 Run focused frontend/backend/pricing tests and `git diff --check`
- [x] T017 Run frontend typecheck, lint, all Vitest and build
- [x] T018 Run full backend tests and Prisma validate without migration
- [x] T019 Run full desktop/mobile Playwright suite
- [x] T020 Confirm existing Forever rights, Focus checkout/webhook, schema and LandingPage guards
- [x] T021 Update verification results and remaining dev check in `specs/011-forever-unification/quickstart.md`
- [ ] T022 Create thematic commits, merge fast-forward into `dev` and push `dev` without deploy or production mutation

## Dependencies

- US1 establishes the single public plan value before US2/US3 cleanup.
- US2 and US3 can proceed after US1; payment route work is sequential with its test.
- Verification depends on all stories.

## Parallel Opportunities

- T004 and T006 are independent test-first tasks.
- T008 and T010 touch backend/frontend separately.
- T012 and T013 split frontend/backend terminology.

## Implementation Strategy

1. Preserve existing lifetime rights and normalize public state.
2. Close the mutation route before removing its client.
3. Normalize current user-facing terminology.
4. Prove no schema/Focus regression, commit, merge and push dev.
