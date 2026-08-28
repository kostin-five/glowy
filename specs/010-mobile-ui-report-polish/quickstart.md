# Quickstart: проверить мобильную полировку и отчёты

## Automated baseline

```bash
npm run typecheck
npm run lint
npm run test -- --run
npm run build
npm run test:e2e
cd backend && npm test
```

Ожидается: всё зелёное; `src/pages/LandingPage.tsx` и `backend/prisma/schema.prisma` без feature diff.

Baseline 2026-08-28: предыдущий полный frontend набор — typecheck/lint/build, 115 Vitest и 91 Playwright pass (1 intentional skip); backend — 133 pass. Feature guards перед реализацией: LandingPage и Prisma schema без diff. Текущий operations scope: дневная стоимость уже агрегируется по user/plan/provider/model; admin остаётся v3.8.0 и не входит в этот build.

## Mobile shell

На 320/360/390/430 px проверить одну строку Task heading, полные tabs/counts, отсутствие overlap чата и horizontal scroll. В collapsed Sidebar routes отсутствуют из tab order.

На physical iOS/Android без reduced-motion сфера поворачивается за 2 секунды. С reduced-motion статичность допустима.

## Dashboard и bulk

Проверить read-only cards с duration/category и 0/частью/всеми subtasks. На Главной нет mutations. Для bulk проверить tomorrow/custom date, offline queue и partial failure.

## Analytics report

Fixture включает headings/lists/bold/literal HTML. Проверить safe render, copy success/failure, route/reload restore, account/period isolation, delete и failed regeneration retaining old report.

## Forever и operations

Pricing: `Forever`, disabled `Скоро`, activation API не вызывается; internal Founder сохраняет lifetime status. Backend/DB неизменны.

`docs/ai-unit-economics.md`: cost per request/user-day доступен только при filled pricing env, prompt text не хранится. Admin implementation остаётся v3.8.0.

## Итог проверки 2026-08-28

- Focused Vitest и Playwright по Главной, shell, bulk, отчётам и Pricing: пройдены.
- Frontend: typecheck и lint пройдены; 134 Vitest пройдены; production build собран.
- Backend: 134 теста пройдены; `prisma validate` пройден без миграций и подключения к production.
- Full Playwright: 103 сценария пройдены, 1 намеренно пропущен; desktop и mobile projects.
- На 320/360/390/430 px автоматизированы отсутствие horizontal overflow, видимость tabs/counts, dashboard read-only, chat/sidebar collision и состояния motion/reduced-motion сферы.
- `LandingPage.tsx`, Prisma schema, backend Founder implementation и `PaymentApi.activateFounderPlan` не менялись в рамках feature; secrets и пользовательские тексты не логируются.
- Физический iOS/Android не проверялся: остаётся ручная проверка плавности сферы на настоящем touch-устройстве.
- Dev/production deploy и инфраструктурные настройки не выполнялись; ручная проверка dev остаётся после отдельного согласованного deploy.
