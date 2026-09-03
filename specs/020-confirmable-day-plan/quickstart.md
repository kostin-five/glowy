# Quickstart: проверка подтверждаемого плана дня

## Automated

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test e2e/dashboard-day-plan.spec.ts --reporter=line
npm run test:e2e -- --reporter=line
```

## Manual desktop/mobile

1. Создать активные задачи: просроченную, на сегодня, без даты и будущую с разной энергией.
2. На Главной менять энергию 20/50/90 и проверить очередь из 1/2/3 задач и объяснение.
3. Открыть `Настроить план`, снять пункт и закрыть: даты не меняются.
4. Открыть снова, выбрать пункты, подтвердить: выбранные появляются в `Сегодня`, остальные нет.
5. Повторить на 320, 360, 390 и 430 px: dialog не выходит за viewport, checkbox и действия доступны.
6. В offline режиме подтвердить одну задачу и проверить существующий статус синхронизации после reconnect.

## Privacy check

В сетевых запросах нет нового endpoint; продуктовые события не содержат id, названия, категории,
даты или другие тексты задач.

## Rollback

Revert одного feature commit. БД, env, backend и production не меняются.
