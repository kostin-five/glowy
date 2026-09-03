# Quickstart: Глобальное быстрое создание задачи

**Локальный статус 2026-09-03**: implementation завершён; typecheck, lint, 166 unit/component tests, build, feature Playwright 6/6 и расширенная regression 92/92 проходят. Production и push не выполнялись.

## Prerequisites

- Использовать локальную dev-базу и тестовый аккаунт; production credentials не нужны.
- Не запускать migration или production services.

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test e2e/quick-task-launcher.spec.ts
```

## Manual desktop scenario

1. Открыть Главную и нажать «Новая задача» в Sidebar.
2. Убедиться, что route не изменился, фокус находится в названии, а сохранение только названия создаёт одну задачу.
3. Свернуть Sidebar: icon остаётся доступным и имеет tooltip/accessible name.
4. На Задачах проверить, что FAB и пустое состояние открывают тот же dialog без наложения.
5. Открыть Заметки, Прогресс, Аналитику, Настройки и Glowy AI; проверить точку входа и сохранение исходного route после cancel/save.

## Manual mobile and Mini App scenario

1. Проверить widths 320, 360, 390 и 430 px.
2. На обычном экране нажать compact action в Header; элементы не переполняют ширину.
3. На `/ai` нажать action в chat header; dialog не перекрывается нижней навигацией.
4. Открыть клавиатуру, сохранить и отменить; основные действия доступны, исходный экран сохраняется.

## Failure and regression scenario

1. Имитировать ошибку сохранения и убедиться, что draft остаётся в единственном dialog.
2. Повторно вызвать launcher и быстро подтвердить дважды: создаётся не более одной задачи.
3. Проверить обычный ввод в заметке и AI-чате: launcher сам не открывается.
4. Подтвердить отсутствие изменений в `src/pages/LandingPage.tsx`, backend, contracts, Prisma и production configuration.
