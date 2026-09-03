# Quickstart: Проверка мобильной навигации заметок

## Automated

```bash
npm run test -- src/pages/NotesPage.test.tsx
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test e2e/mobile-notes-navigation.spec.ts
```

## Manual

1. На ширинах 320, 360, 390 и 430 px открыть `/notes`: редактор не расположен под списком.
2. Открыть существующую и новую заметку: список заменяется редактором.
3. Изменить текст и сразу нажать «Назад к заметкам»: дождаться сохранения и проверить запись после повторного открытия.
4. Имитировать ошибку API: редактор и введённый текст остаются видимыми.
5. Проверить browser back, direct `/notes/:id`, архив/восстановление и отсутствие горизонтального overflow.
6. На desktop проверить неизменную двухколоночную компоновку.

## Rollback

Вернуть responsive wrappers, mobile back prop и boolean-return save helper. Server data и API contract не требуют rollback.

## Final evidence

- Focused Notes: 12/12 passed.
- Frontend: typecheck, lint, 183/183 tests and production build passed.
- Playwright: focused 4/4; full suite 123 passed and 1 intentionally skipped.
- Проверены mobile widths 320/360/390/430 px и desktop two-column layout.
- Backend suite не перезапускался: backend и API contracts не менялись; браузерные проверки используют изолированные API fixtures.
- Ручная проверка на физическом телефоне и в production не выполнялась; она остаётся частью итоговой приёмки перед выпуском.
