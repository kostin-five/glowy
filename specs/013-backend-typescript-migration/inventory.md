# Backend JavaScript Migration Inventory

**Baseline date**: 2026-09-01

**Scope**: tracked JavaScript under `backend/`

**Total**: 95 files — 46 runtime/support and 49 tests

**Excluded component**: `ai-proxy/server.js` (separate deployable rollback component)

Pre-existing, migration-support, or post-migration TypeScript files outside the 95-file JavaScript baseline are
also declared and checked by the automatic gate:

- `backend/prisma.config.ts`
- `backend/services/tasks/task-contract.service.ts`
- `backend/type-tests/contracts.type-test.ts`
- `backend/types/boundaries.ts`
- `backend/types/express.d.ts`
- `backend/types/request-context.ts`

Status values: `pending`, `converted`, `excluded`. Core backend release target is 95 `converted`, 0 `pending`, 0 `excluded`.

| Path | Category | Domain | Slice | Status |
|---|---|---|---|---|
| `backend/app.js` | runtime-support | entrypoint | entrypoint | converted |
| `backend/constants/profile.constants.js` | runtime-support | auth-profile | auth | converted |
| `backend/lib/logger.js` | runtime-support | foundation | foundation | converted |
| `backend/lib/prisma.js` | runtime-support | auth-profile | auth | converted |
| `backend/middleware/auth.middleware.js` | runtime-support | auth-profile | auth | converted |
| `backend/middleware/error.middleware.js` | runtime-support | foundation | foundation | converted |
| `backend/middleware/request-id.middleware.js` | runtime-support | foundation | foundation | converted |
| `backend/routes/ai.routes.js` | runtime-support | ai | ai | converted |
| `backend/routes/analytics.routes.js` | runtime-support | analytics | profile-notes-analytics | converted |
| `backend/routes/auth.routes.js` | runtime-support | auth-profile | auth | converted |
| `backend/routes/chat.routes.js` | runtime-support | ai | ai | converted |
| `backend/routes/notes.routes.js` | runtime-support | notes | profile-notes-analytics | converted |
| `backend/routes/payment.routes.js` | runtime-support | payments | payments | converted |
| `backend/routes/progress.routes.js` | runtime-support | progress | profile-notes-analytics | converted |
| `backend/routes/subtask.routes.js` | runtime-support | tasks | tasks | converted |
| `backend/routes/task.routes.js` | runtime-support | tasks | tasks | converted |
| `backend/routes/telegram.routes.js` | runtime-support | telegram | telegram | converted |
| `backend/routes/user.routes.js` | runtime-support | auth-profile | profile-notes-analytics | converted |
| `backend/scripts/telegram-webhook.js` | runtime-support | telegram | telegram | converted |
| `backend/server.js` | runtime-support | entrypoint | entrypoint | converted |
| `backend/services/ai/ai-limits.service.js` | runtime-support | ai | ai | converted |
| `backend/services/ai/ai-limits.service.test.js` | test | ai | tests-core | converted |
| `backend/services/ai/ai-provider.service.js` | runtime-support | ai | ai | converted |
| `backend/services/ai/ai-provider.service.test.js` | test | ai | tests-core | converted |
| `backend/services/ai/mind-hub-parser.service.js` | runtime-support | ai | ai | converted |
| `backend/services/ai/mind-hub-parser.service.test.js` | test | ai | tests-core | converted |
| `backend/services/ai/mind-hub-readonly.test.js` | test | ai | tests-core | converted |
| `backend/services/ai/mind-hub.service.js` | runtime-support | ai | ai | converted |
| `backend/services/ai/note-task-draft.service.js` | runtime-support | ai | ai | converted |
| `backend/services/ai/note-task-draft.service.test.js` | test | ai | tests-core | converted |
| `backend/services/analytics/ai-usage-accounting.service.js` | runtime-support | ai | ai | converted |
| `backend/services/analytics/analytics.service.js` | runtime-support | analytics | profile-notes-analytics | converted |
| `backend/services/auth/auth-session.service.js` | runtime-support | auth-profile | auth | converted |
| `backend/services/auth/credentials.service.js` | runtime-support | auth-profile | auth | converted |
| `backend/services/billing/plan-entitlements.service.js` | runtime-support | payments | auth | converted |
| `backend/services/billing/plan-entitlements.service.test.js` | test | payments | tests-core | converted |
| `backend/services/feature-entitlements.service.js` | runtime-support | payments | auth | converted |
| `backend/services/progress/achievements.service.js` | runtime-support | progress | profile-notes-analytics | converted |
| `backend/services/progress/progress.service.js` | runtime-support | progress | profile-notes-analytics | converted |
| `backend/services/tasks/task-completion.service.js` | runtime-support | tasks | tasks | converted |
| `backend/services/tasks/task-write.service.js` | runtime-support | tasks | tasks | converted |
| `backend/services/tasks/task-write.service.test.js` | test | tasks | tests-core | converted |
| `backend/services/telegram/telegram-api.client.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-command-catalog.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-link.service.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-mini-app-auth.service.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-mini-app-session.service.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-mini-app-url.service.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-update.service.js` | runtime-support | telegram | telegram | converted |
| `backend/services/telegram/telegram-worker.service.js` | runtime-support | telegram | telegram | converted |
| `backend/test/achievements.test.js` | test | progress | tests-core | converted |
| `backend/test/ai-contract-routes.test.js` | test | ai | tests-core | converted |
| `backend/test/ai-tone.test.js` | test | ai | tests-core | converted |
| `backend/test/ai-usage-accounting.test.js` | test | ai | tests-core | converted |
| `backend/test/analytics-routes.test.js` | test | analytics | tests-core | converted |
| `backend/test/analytics-service.test.js` | test | analytics | tests-core | converted |
| `backend/test/app.test.js` | test | foundation | tests-core | converted |
| `backend/test/auth-middleware-telegram.test.js` | test | telegram | tests-core | converted |
| `backend/test/auth-routes.test.js` | test | auth-profile | tests-core | converted |
| `backend/test/contract-test-helpers.js` | test | foundation | tests-core | converted |
| `backend/test/endpoint-inventory.test.js` | test | foundation | tests-core | converted |
| `backend/test/forever-terminology.test.js` | test | foundation | tests-core | converted |
| `backend/test/logger.test.js` | test | foundation | tests-core | converted |
| `backend/test/notes-routes.test.js` | test | notes | tests-core | converted |
| `backend/test/payment-contract-routes.test.js` | test | payments | tests-core | converted |
| `backend/test/payment-feature-flags.test.js` | test | payments | tests-core | converted |
| `backend/test/progress-routes.test.js` | test | progress | tests-core | converted |
| `backend/test/progress-service.test.js` | test | progress | tests-core | converted |
| `backend/test/task-completion-service.test.js` | test | tasks | tests-core | converted |
| `backend/test/task-contract-routes.test.js` | test | tasks | tests-core | converted |
| `backend/test/task-time.test.js` | test | tasks | tests-core | converted |
| `backend/test/telegram-api-client.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-draft-confirm.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-link.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-mini-app-auth.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-mini-app-routes.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-mini-app-session.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-mini-app-url.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-routes.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-schema.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-test-helpers.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-update.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-add.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-ai.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-done.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-energy.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-navigation.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker-read.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/telegram-worker.test.js` | test | telegram | tests-telegram | converted |
| `backend/test/user-preferences.test.js` | test | auth-profile | tests-core | converted |
| `backend/test/user-telegram.test.js` | test | telegram | tests-core | converted |
| `backend/test/validation-utils.test.js` | test | foundation | tests-core | converted |
| `backend/utils/ai-date.utils.js` | runtime-support | ai | ai | converted |
| `backend/utils/ai-errors.utils.js` | runtime-support | ai | ai | converted |
| `backend/utils/validation.utils.js` | runtime-support | foundation | foundation | converted |
