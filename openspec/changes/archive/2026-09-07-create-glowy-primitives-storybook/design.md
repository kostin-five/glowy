## Context

См. мотивацию в `proposal.md`. Semantic token layer уже предоставляет public roles и Tailwind 4
bridge, но текущий `src/components/ui/` содержит legacy `Modal`, loaders и menus, а dialogs/sheets
в разных product areas напрямую используют Headless UI и локальные Tailwind values. В проекте есть
React 19, Vite 8, Tailwind 4, Lucide и Headless UI; нет Radix, class-variance helper или Storybook.
Ни один существующий route не должен стать неявным потребителем нового слоя в этом change.

## Goals / Non-Goals

**Goals:**

- Создать единый semantic-token-first primitive API, достаточный для следующего dashboard slice и
  последующих небольших UI changes.
- Зафиксировать keyboard/focus/overlay/mobile behavior тестами и isolated stories.
- Добавить локальный React/Vite Storybook без API, auth и product routing.

**Non-Goals:**

- Не переписывать существующие Headless UI components и не переименовывать legacy `Modal`.
- Не добавлять product-level toast store, new navigation, backend flow, runtime data fetch или
  облачный visual regression.
- Не назначать Storybook hosting, CI deployment или baseline service.

## Decisions

### Radix primitives как единый accessibility layer для нового кода

Новые composable overlays и selection controls строятся на выбранных Radix React primitives, а
Glowy-обёртки владеют public API, tokens, русскими default labels там, где они нужны, и styling.
Репозиторий хранит собственный TypeScript-код, используя shadcn/ui как reference pattern, а не
генерирует или принимает его default theme. Для base HTML controls Radix не нужен: Button, inputs,
Card, Badge, feedback components останутся лёгкими typed React components.

Это сохраняет управляемый focus, Escape, portals, roving selection и aria contracts там, где они
сложнее обычного HTML, не создавая нового диалога с нуля. Headless UI остаётся текущим legacy layer
до отдельного migration change; использовать оба слоя в одном новом primitive запрещено.

Альтернативы:

- оставить Headless UI единственным source для новых primitives — отклонено: новый design-system
  layer должен выбрать один repeatable API и не быть привязан к текущим разрозненным wrappers;
- подключить shadcn CLI и принять сгенерированные default styles — отклонено: это размоет Glowy
  tokens и усложнит обзор каждого исходника;
- написать overlays только на HTML/CSS — отклонено: focus management и keyboard accessibility
  слишком рискованны для повторной реализации.

### Новый namespace без миграции legacy `src/components/ui`

Primitives размещаются в отдельном `src/components/ui/primitives/` с маленькими public entry points
и co-located tests/stories. Legacy components остаются на своих именах и импорт-путях. Новый слой
публикует Button/IconButton, form controls, surfaces, feedback, overlays и selection components из
одного явного index; component потребляет только public semantic tokens и не вводит shared raw
palette values.

Список primitive остаётся ограниченным roadmap: Button, IconButton, Input, Textarea, Label/Field,
Card, Badge, Dialog, Sheet, Popover, Select, Tabs, Tooltip, Skeleton, EmptyState, Alert и Toast.
В первом change они получают states, stories и tests, но не становятся скрытым глобальным app state
или обязательной заменой существующих consumers.

Альтернатива — мигрировать components по месту в `src/components/ui/` — отклонена: изменение
существующих import contracts смешает foundation с product regression и затруднит rollback.

### Предсказуемые controlled APIs и accessibility defaults

Interactive primitives поддерживают явный controlled API (`open`/`onOpenChange`, value callbacks)
и нативные HTML props; optional uncontrolled behavior допускается только там, где это предоставляет
выбранный accessibility primitive без второго источника истины. IconButton требует accessible name;
Field связывает label, description/error и control через устойчивые ids; disabled/loading controls
не вызывают handler и объявляют состояние. Dialog/Sheet/Popover возвращают focus триггеру после
Escape/close, а Sheet сохраняет safe-area и 44 px target contract.

Toast остаётся scoped provider/component API: этот change не добавляет app-wide notification store
и не заменяет локальные confirmation patterns в Settings или Login. Это не позволяет новому
tooling-слою незаметно менять product messages или data actions.

### Storybook React/Vite как локальный catalog

Storybook подключается через поддерживаемый React/Vite framework и accessibility addon после
проверки peer compatibility с зафиксированными React 19/Vite 8/TypeScript 6. `.storybook/preview`
импортирует тот же global token/style entry и устанавливает theme decorator, переключающий текущий
`.dark` class contract. Toolbar даёт light/dark и compact mobile viewport; stories не импортируют
`App`, stores, API clients или service worker.

Каждый primitive получает обозримые CSF stories, а overlays — отдельные keyboard/focus stories.
Commands `storybook`, `build-storybook` и focused interaction/a11y test фиксируются в
`package.json` и documentation. Static `storybook-static/` игнорируется как local artifact и не
подключается к Vite PWA или deploy config.

Альтернативы:

- оставить только техническую foundation showcase — отклонено: она не покрывает isolated component
  states и interaction variants;
- добавить cloud visual service — отклонено roadmap и отсутствием owner decision;
- добавить catalog как application route — отклонено: он нарушит production/auth/navigation boundary.

### Проверки и dependency discipline

Перед добавлением packages apply фиксирует совместимые стабильные версии в `package-lock.json`,
выполняет `npm audit` в relevant root и не меняет несвязанные dependencies. Тесты покрывают
semantic token usage, field associations, disabled/loading actions, keyboard overlay close/focus
return, selection controls, light/dark presentation и compact viewport. Проверяются TypeScript,
lint, Vitest, production/PWA build, Storybook build и focused Playwright; legacy mobile smoke
остаётся регрессией без массовой миграции.

## Risks / Trade-offs

- [Radix или Storybook peer dependency не совместима с актуальными React/Vite] → проверить official
  compatibility и lockfile перед install, остановиться при неприемлемом forced downgrade.
- [Новые utilities незаметно меняют legacy UI] → импортировать только token-compatible local styles,
  не редактировать product consumers и выполнить existing desktop/mobile smoke.
- [Overlay API создаст параллельный source of truth] → использовать controlled callbacks и не
  добавлять global notification/dialog store.
- [Storybook отрендерит app infrastructure или сделает API request] → stories импортируют только
  primitives, а browser test фиксирует отсутствие `/api/` requests.
- [Полный набор окажется слишком широким для одного review] → держать public API маленьким,
  stories co-located и не начинать migration; любой missing product-specific variant идёт отдельным
  change.

## Migration Plan

1. Проверить peer compatibility, добавить только требуемые dependencies и Storybook scripts/config.
2. Реализовать primitives поверх token layer и их isolated stories/tests без product imports.
3. Проверить Storybook dev/build, accessibility/interaction cases, legacy theme/mobile smoke и
   frontend gates; обновить design-system documentation и handoff.
4. Следующий dashboard change использует новые public primitives; legacy consumers остаются
   нетронутыми до отдельного scoped migration.
5. Rollback — revert этого frontend/tooling change и package-lock updates; пользовательские данные,
   server state, PWA cache contract и production configuration не требуют migration или cleanup.

## Open Questions

- При apply точный раздел Radix dependencies (единый package или узкие packages) выбирается по
  проверенной peer compatibility и audit; это не меняет public contracts или scope primitives.
