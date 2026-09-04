# Tasks: Персонализация фона

## Phase 1: Contracts and focused tests

- [x] T001 Добавить строгий тип и normalization tests для wallpaper id в settings store
- [x] T002 Добавить database-free IndexedDB adapter и unit tests чтения/записи/удаления
- [x] T003 Добавить component tests picker: выбор preset, valid upload, ошибки, reset

## Phase 2: Implementation

- [x] T004 Описать встроенные CSS-фоны и безопасные preview styles
- [x] T005 Реализовать hook загрузки custom Blob с object URL lifecycle и fallback
- [x] T006 Применить более тёмный фон и защитные слои в `AppLayout`
- [x] T007 Добавить responsive picker в существующий раздел настроек
- [x] T008 Удалять custom Blob при очистке локального кэша

## Phase 3: Verification and documentation

- [x] T009 Выполнить focused unit/component tests и frontend typecheck
- [x] T010 Обновить roadmap, architecture и handoff текущим состоянием и rollback
- [x] T011 Выполнить converge-аудит spec/plan/tasks против реализации

## Dependencies

T001–T003 → T004–T008 → T009–T011. Storage adapter и визуальные presets независимы до интеграции picker/hook.
