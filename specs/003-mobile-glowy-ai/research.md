# Research: Мобильный Glowy AI

## Decision 1: Использовать существующий mobile breakpoint

**Decision**: Показывать новую нижнюю навигацию и sheets до `lg`, как текущий `BottomNav`, а
desktop Sidebar оставлять без изменений.

**Rationale**: Это сохраняет уже принятую границу layout и исключает промежуточный режим, где
одновременно видны две навигации.

**Alternatives considered**: Отдельный breakpoint только для телефонов — отклонён из-за
несогласованности с существующим layout.

## Decision 2: Headless UI для нижних листов

**Decision**: Собрать mobile sheets на уже установленном Headless UI `Dialog` и `Transition`.

**Rationale**: Он уже используется проектом и закрывает focus trap, Escape, aria-modal, backdrop и
возврат фокуса без новой зависимости.

**Alternatives considered**: Самописный fixed panel — отклонён из-за риска accessibility и
несогласованного modal behavior.

## Decision 3: Один conversation store для двух поверхностей

**Decision**: Перенести browser-local сообщения и pending drafts из локального состояния
`MindHubChat` в небольшой persisted Zustand store с сохранением совместимости с текущей историей.

**Rationale**: Быстрый sheet размонтируется при переходе на `/ai`; общий store предотвращает
потерю разговора и черновика и не создаёт серверную или AI-архитектуру.

**Alternatives considered**: Два независимых экземпляра local state — отклонено из-за рассинхрона.
Новая backend history — отклонена как отдельная задача с данными и миграциями.

## Decision 4: Варианты одного chat component

**Decision**: Добавить `dashboard`, `quick` и `page` варианты компоновки в `MindHubChat`, сохранив
одну реализацию отправки, лимитов, ответов и подтверждения draft.

**Rationale**: Поведение AI критично и не должно дублироваться между двумя новыми точками входа.

**Alternatives considered**: Отдельные QuickChat и FullChat с собственной логикой — отклонены как
параллельный flow.

## Decision 5: Code-native animated orb

**Decision**: Создать SVG orb с мягким glow/pulse/orbit и отключением непрерывной анимации через
`motion-reduce`.

**Rationale**: SVG остаётся резким на мобильных экранах, не добавляет asset/network cost и легко
подстраивается под темы и состояния.

**Alternatives considered**: Растровая кнопка из референса — отклонена; готовая Lottie-анимация —
отклонена из-за новой зависимости и лишнего веса.

## Decision 6: Scope навигации

**Decision**: Пять основных слотов: `/dashboard`, `/tasks`, AI sheet, `/stairs`, More sheet с
`/analytics` и `/settings`.

**Rationale**: Точно соответствует пользовательскому запросу и roadmap, сохраняя доступ ко всем
текущим основным mobile-разделам.

**Alternatives considered**: Оставить аналитику отдельным нижним пунктом — не соответствует новому
порядку. Создать новую страницу прогресса — выходит за scope.
