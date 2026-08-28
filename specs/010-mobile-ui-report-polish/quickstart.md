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

