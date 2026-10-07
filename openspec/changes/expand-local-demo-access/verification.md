# Проверка expand-local-demo-access

Дата: 2026-10-07. Рабочая ветка: `codex/expand-local-demo-access` от проверенной `dev`.
Реализация локально завершена; commit, push, merge, deploy и миграции не выполнялись.

## Итог

| Измерение | Результат |
| --- | --- |
| Completeness | 16/17 задач; 5.4 — внешний production gate без разрешения |
| Correctness | Все 6 требований реализованы и покрыты проверками |
| Coherence | Существующие API/UI/Zustand/контракты переиспользованы; backend auth и Prisma не изменены |

## Соответствие требованиям

| Требование | Реализация и проверка |
| --- | --- |
| Локальные возможности | `src/demo/demoProgress.ts`, ProgressApi, AnalyticsApi, progress hooks, SuccessStairsPage, SettingsPage и ProfilePreferencesPanel; unit, component и desktop/mobile E2E |
| Заметки и связи | `src/demo/demoNotes.ts`, NoteApi, NotesPage; CRUD, поиск, архив/восстановление, уникальные связи, очистка после удаления задачи; unit и E2E reload/offline |
| Изоляция | Версионированный guest IndexedDB, отдельный снимок задач, generation/session guards, guest query/mutation keys; guest → account → guest, поздний ответ, повреждённые данные и отказ записи; синтетические browser scopes без uploads |
| Запрет AI | Ранние guest guards AiApi/NoteApi/AnalyticsApi и disabled UI чат/голос/шаги/заметки/отчёт; network spy, неизменная квота и browser assertions |
| Интеграции и права | Честный текст SettingsPage, отсутствие guest UserApi/checkout/Telegram/cloud; существующие серверные authorization/payment/Telegram проверки не ослаблены |
| Главная | Удалены настройка плана, dialog flow и уведомление; «Сегодня», энергия и read-only следующие шаги сохранены; Dashboard unit и desktop/mobile E2E |

Расчёты серии, календаря и привычек используют чистые существующие backend-функции
без Prisma, pools или сетевых вызовов. Каталог достижений переиспользован; даты и
ответы валидируются общими контрактами. Локальные focus presentation flags не
меняют профиль аккаунта, платный план или серверный entitlement.

## Выполненные проверки

- `npm run typecheck` — passed.
- `npm run lint` — passed, без ошибок/предупреждений.
- `npm run test` — 281/281 тест, 75 файлов.
- `npm --prefix backend test` — 191/191 database-free тест.
- `npm run build` — passed, включая production frontend и PWA.
- `npm run test:e2e -- --workers=2` — 157 passed, 1 штатный skip:
  mobile-only проверка подсказки на desktop-проекте.
- После добавления проверок календаря и отказа IndexedDB:
  `npm run test:e2e -- e2e/local-demo-access.spec.ts --workers=2` — 6/6 passed
  (по 3 сценария desktop/mobile). Покрыты notes/link/reload/offline, привычки,
  календарь, аналитика, аватар и обычная настройка, возврат в демо, AI-block,
  account isolation и отсутствие защищённых guest API requests.
- `npm run openspec:validate` — 14/14 strict valid; повторная strict validation
  данного change passed.
- `git diff --check` — passed. LandingPage, backend source, secrets и production
  конфигурация не изменены.

HTTP/browser тесты первоначально упёрлись в sandbox `listen EPERM`; повторены с
разрешением временных локальных портов. Неуспешный прогон при параллельной пересборке
`dist` повторён последовательно на тестовой сборке и прошёл. Оставшихся failing
checks нет. Реальная Neon и живые AI/платежи/Telegram не использовались.

## Остаток и ограничения

CRITICAL для archive: задача 5.4 ещё не выполнена. Не публиковать и не архивировать
change до отдельного разрешения на push/deploy и smoke-проверки `glowy-ai.ru` на
новой Production-сборке. Локальный handoff готов; это не подтверждение текущего
поведения опубликованного сайта.

Локальные данные привязаны к origin и браузеру, не являются backup и не переносятся
между `dev.glowy-ai.ru`, `glowy-ai.ru` и локальным сервером. Очистка данных сайта может
их удалить. Offline edits проверены на уже загруженном приложении; cold-start
offline зависит от наличия PWA cache и не обещается на первом визите.

Production rollback: предыдущая frontend-сборка без удаления guest storage;
backend/база не требуют отката для этого изменения. Archive не выполнялся.
