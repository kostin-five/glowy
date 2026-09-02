# Research: Быстрое создание и режимы полей задачи

## Decision 1 — Режимы управляют только представлением

**Decision**: «Коротко», «Средне» и «Полно» определяют видимые поля одной существующей задачи и одного TaskDraft.

**Rationale**: Сохраняются API, offline queue, Telegram и аналитика; переключение режима не требует преобразования данных и безопасно откатывается.

**Alternatives considered**: Разные типы задач или разные payload-схемы отклонены как параллельная модель и источник несовместимости.

## Decision 2 — Средний режим является совместимым default

**Decision**: Legacy/unknown preference нормализуется в `medium`; энергия и приоритет видимы.

**Rationale**: Это ближе всего к текущей форме и не скрывает привычные пользователю возможности после обновления.

**Alternatives considered**: `compact` для всех ускорил бы ввод, но неожиданно изменил бы существующий UX; `full` сохранил бы перегрузку.

## Decision 3 — UI preference изолируется по аккаунту на устройстве

**Decision**: Расширить существующий persisted settings layer account-scoped ключом формы, не добавляя серверную настройку в первом slice.

**Rationale**: Не нужна migration, а смена аккаунта не переносит персональный вид формы другому человеку на том же устройстве.

**Alternatives considered**: Один глобальный localStorage state нарушает изоляцию; серверная синхронизация требует нового profile contract и отдельного data change.

## Decision 4 — Create и edit используют общее правило видимости

**Decision**: Вынести режимы, labels и вычисление видимых секций в один типизированный presentation layer; локальное состояние полей остаётся в существующих формах.

**Rationale**: Исключает расхождение create/edit без переписывания DnD подзадач и mutation logic.

**Alternatives considered**: Полное объединение двух больших форм в одном изменении отклонено как рискованный несвязанный рефакторинг.

## Decision 5 — Mobile использует responsive dialog как bottom sheet

**Decision**: Сохранить один Headless UI Dialog с desktop centered panel и mobile bottom-sheet presentation, общей focus/escape/backdrop семантикой.

**Rationale**: Не появляется параллельная mobile-форма, а клавиатурная доступность и focus management остаются в одном primitive.

**Alternatives considered**: Отдельный mobile modal дублирует логику; полноэкранная route-форма увеличивает scope и меняет навигационный contract.

## Decision 6 — AI decomposition не входит в slice

**Decision**: Существующая кнопка «AI шаги» остаётся информирующей о будущем flow; новый provider request и применение подзадач не добавляются.

**Rationale**: AI требует отдельного contract, quota, error и confirmation design; смешивание с presentation slice затруднит rollback.

**Alternatives considered**: Встроить генерацию сразу отклонено по scope и правилу малых проверяемых изменений.

## Decision 7 — Быстрый вход сначала ограничен экраном задач

**Decision**: Улучшить существующие CTA и modal title-first flow на Tasks; глобальная панель с любой страницы остаётся следующим независимым расширением.

**Rationale**: Проверяет основную гипотезу без изменения AppLayout, keyboard shortcuts и всех страниц.

**Alternatives considered**: Глобальный launcher полезен, но требует отдельного UX для конфликтов с AI sheet, mobile nav и открытыми dialog.
