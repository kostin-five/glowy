# Tasks: AI Providers and Founder Plan

**Input**: Design documents from `/specs/004-ai-founder/`

## Phase 1: Provider foundation

- [x] T001 [US1] Replace Gemini-specific provider logic with direct DeepSeek and GigaChat adapters in `backend/services/ai/ai-provider.service.js`
- [x] T002 [US1] Normalize provider errors and fallback eligibility in `backend/utils/ai-errors.utils.js`
- [x] T003 [US1] Remove Gemini wording from business services and active backend dependencies
- [x] T004 [US1] Add isolated provider routing, timeout, token-cache, and fallback tests in `backend/services/ai/ai-provider.service.test.js`
- [x] T005 [US1] Make `ai-proxy/` Gemini-free and provider-neutral as a temporary rollback path

## Phase 2: Founder entitlement

- [x] T006 [US2] Add a no-migration Founder representation helper and normalize current-plan responses
- [x] T007 [US2] Update pricing, settings, AI plan types, and legal copy from free Forever to Founder
- [x] T008 [US3] Close new Founder activation server-side by default and remove the activation interaction from pricing
- [x] T009 [US2] Add tests for Founder normalization and retained AI limit

## Phase 3: Disabled paid Forever

- [x] T010 [US4] Add disabled paid Forever configuration to the shared YooKassa flow
- [x] T011 [US4] Add backend tests proving disabled checkout does not call YooKassa or write payments
- [x] T012 [US4] Show paid Forever as unavailable in pricing

## Phase 4: Documentation and verification

- [x] T013 Update environment examples, README, architecture, deploy, legal, and release documentation
- [x] T014 Run backend and frontend checks and fix regressions
- [x] T015 Run Spec Kit consistency and convergence review; record operator-only tasks

## Dependencies

- T001 blocks T002-T005.
- T006 blocks T007-T009.
- T010 blocks T011-T012.
- T013 follows implementation; T014 and T015 close the release handoff.
