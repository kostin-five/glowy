# Research: Мобильная полировка и устойчивые отчёты

## Надёжная анимация SVG на touch Safari

**Decision**: именованный CSS keyframe на SVG-группе с `transform-box: fill-box`, `transform-origin: center`, `will-change: transform` и reduced-motion media query.

**Rationale**: явные свойства устраняют различия desktop emulation/physical Safari без JS loop и лишнего расхода батареи.

**Alternatives considered**: SMIL хуже управляется reduced-motion; requestAnimationFrame усложняет lifecycle; Canvas избыточен.

## Общий вид task-card без интерактивности

**Decision**: вынести presentation-метаданные и создать специализированную `ReadOnlyTaskCard`.

**Rationale**: полный `TaskItem` принесёт DnD и mutations; копия JSX быстро разойдётся.

## Массовый перенос

**Decision**: существующий `updateTask` с локальной `YYYY-MM-DD` датой и агрегированным результатом.

**Rationale**: store уже поддерживает offline queue. Новый bulk endpoint создал бы второй mutation path.

## Рендер и хранение отчёта

**Decision**: ограниченный parser headings/lists/bold без HTML; versioned localStorage record с identity `userId + period + from + to`.

**Rationale**: закрывает текущий формат и route/reload restore без migration, bundle dependency и межаккаунтной утечки.

**Alternatives considered**: plain text сохраняет дефект; `dangerouslySetInnerHTML` небезопасен; sessionStorage не переживает закрытие; DB требует отдельного feature.

## Founder/Forever

**Decision**: PricingPage показывает disabled Forever preview и не вызывает legacy activation; internal Founder recognition остаётся.

**Rationale**: сохраняет entitlement и ручное назначение без публичного бесплатного пути.

## Unit-экономика и admin

**Decision**: документировать существующие дневные user/provider/model/token/cost aggregates; admin остаётся v3.8.0.

**Rationale**: `AiUsageDaily` уже позволяет cost per user/day и среднюю стоимость запроса без prompt text. Admin требует RBAC, audit log и privacy scope.

