# Quickstart: проверить единый Forever

## Focused checks

1. Billing service возвращает `forever` для существующего active lifetime fixture.
2. Legacy activation отвечает 410 и не вызывает Prisma update.
3. AI limit для `forever` равен 100; premium preferences/analytics доступны.
4. Pricing показывает Forever/Скоро и existing Forever как бессрочный.
5. В актуальных frontend/backend пользовательских текстах нет Founder.

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
cd backend
npm test
npx prisma validate
```

## Guards

- `src/pages/LandingPage.tsx` без diff.
- `backend/prisma/schema.prisma` без diff; migration отсутствует.
- Focus create/payment verification/webhook behavior без diff.
- Production env, DB и deploy не меняются.

## Implementation baseline

- Ветка: `codex/v2.8.0-forever-unification`.
- База: `dev` на коммите `46ef43e`.
- До реализации отдельное публичное имя использовалось в billing/AI mapping,
  frontend-типах, сообщениях доступа и актуальной документации.

## Verification — 2026-08-29

- Focused billing/AI/route/preferences/terminology backend: 10/10 passed.
- Pricing Vitest: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: 44 files, 135 tests passed.
- `npm run build`: passed, PWA precache generated.
- `cd backend && npm test`: 136 tests passed.
- `cd backend && npx prisma validate`: schema valid; migration не создавалась и не применялась.
- `npm run test:e2e`: 103 passed, 1 штатно skipped, desktop/mobile Chromium.
- `git diff --check`: passed.
- Guard diff: `src/pages/LandingPage.tsx`, `backend/prisma/schema.prisma`,
  Focus create/webhook и `e2e/pricing.smoke.spec.ts` не изменены.
- Convergence: 12 FR, 5 SC, acceptance scenarios и constitution constraints
  проверены; новых задач нет.

## Remaining dev check

После автоматического deploy ветки `dev` вручную проверить существующий Forever-аккаунт:
название тарифа, бессрочный статус, AI-лимит 100 и доступ к Focus-функциям. Проверить,
что карточка Forever показывает «Скоро», а прямой legacy activation возвращает 410.
Production не затрагивать.
