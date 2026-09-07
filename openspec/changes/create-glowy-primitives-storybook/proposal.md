## Why

Semantic tokens уже зафиксированы, но следующий dashboard slice всё ещё был бы вынужден собирать
кнопки, поля, dialogs и sheets из одноразовых Tailwind-классов. Нужен небольшой устойчивый слой
Glowy primitives и локальный каталог состояний, чтобы новые интерфейсы сохраняли спокойный характер,
доступность и не создавали ещё одну параллельную реализацию тех же паттернов.

## What Changes

- Добавить ограниченную библиотеку Glowy primitives поверх semantic token contract: Button,
  IconButton, Input, Textarea, Label/Field, Card, Badge, Dialog, Sheet, Popover, Select, Tabs,
  Tooltip, Skeleton, EmptyState, Alert и Toast.
- Принять один доступный primitive layer на основе Radix/shadcn conventions для новых overlay и
  selection controls; определить единые controlled/uncontrolled APIs, keyboard behavior и focus
  return, не меняя существующие product flows.
- Подключить Storybook React/Vite как локальный каталог компонентов с light/dark decorator,
  mobile viewport и accessibility addon; добавить stories для states, особенно loading, empty,
  disabled, destructive и keyboard-visible focus.
- Добавить component/unit/browser tests для общих interaction guarantees и локальные команды
  запуска/сборки каталога. Существующие visual baselines semantic foundation остаются отдельным
  проверочным слоем.

## Non-goals

- Не мигрировать существующие страницы, `LandingPage.tsx`, Headless UI consumers или product
  dialogs/sheets массово; первый потребитель primitives будет следующим dashboard change.
- Не менять backend, API, Prisma, auth, AI, offline queue, Telegram contract, payment, env или
  production configuration.
- Не подключать облачный visual-regression service, не публиковать Storybook и не создавать
  отдельный пользовательский route для каталога.
- Не превращать shadcn/ui в готовую тему: логотип, фирменная сфера, русский интерфейс и семантика
  Glowy сохраняются; в репозиторий берутся только необходимые открытые accessibility patterns.

## Capabilities

### New Capabilities

- `glowy-ui-primitives`: переиспользуемые, тематические и доступные frontend primitives для новых
  интерфейсных сценариев.
- `component-catalog`: локальный Storybook-каталог состояний Glowy components и его проверяемые
  команды.

### Modified Capabilities

- Нет.

## Impact

- Затронуты только frontend package/configuration, новый `src/components/ui` или аналогичный shared
  слой, `.storybook/`, component stories/tests и документация.
- Потребуются совместимые npm dev/runtime dependencies для Storybook React/Vite, a11y-проверок и
  выбранных Radix primitives; точные версии фиксируются только после проверки lockfile и peer
  compatibility во время apply.
- Runtime продуктовых routes, пользовательские данные, production и rollback-инварианты не меняются;
  откат возможен revert одного изолированного frontend/tooling change.
