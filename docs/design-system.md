# Дизайн-система Glowy: foundations и primitives

Semantic token layer в `src/styles/design-tokens.css` — публичная визуальная основа для следующих
shared UI primitives и экранов. Он не меняет существующие product components: это намеренная
постепенная миграция, а не второй набор стилей рядом с текущим интерфейсом.

## Роли токенов

| Группа | Semantic roles | Когда использовать |
| --- | --- | --- |
| Холст и поверхности | `canvas`, `surface`, `surface-raised` | Фон экрана, карточка, приподнятая карточка/контейнер |
| Текст | `text-primary`, `text-secondary`, `text-muted` | Основной контент, пояснение, вторичная подпись |
| Границы | `border-subtle`, `border-strong` | Разделитель или спокойная интерактивная граница |
| Действие | `primary`, `primary-foreground`, `accent`, `accent-foreground` | Главное действие и редкий выразительный акцент |
| Статусы | `status-success`, `status-warning`, `status-danger` и их `-foreground` роли | Успех, внимание и ошибка с читаемым текстом |
| Основа интерфейса | `font-*`, `space-*`, `radius-*`, `elevation-*`, `focus-*`, `motion-*`, `touch-target` | Типографика, ритм, форма, глубина, доступное взаимодействие |

Значения live в CSS custom properties `--glowy-*`; Tailwind 4 bridge публикует их как utilities
`bg-glowy-surface`, `text-glowy-text-primary`, `rounded-glowy-panel`, `shadow-glowy-panel`,
`min-h-glowy-touch-target` и аналогичные. Для shared surfaces нельзя выбирать primitive palette
или локальные hex-значения: выбирайте роль, а значение останется управляемым темой.

## Допустимые пары и доступность

Текст используем только в документированных foreground/background парах:

- `text-primary` или `text-secondary` на `surface`; `text-muted` на `canvas`;
- `primary-foreground` на `primary`, `accent-foreground` на `accent`;
- соответствующий `status-*-foreground` на своём `status-*`;
- `border-strong` и `focus` на `surface` — для интерактивной границы и focus-индикатора.

Обычный текст держит контраст не ниже 4.5:1; крупный текст, интерактивные границы и focus — не
ниже 3:1. Полный machine-readable catalog и проверяемые пары находятся в
`src/design-system/tokens.ts`; тест защищает от расхождения каталога и CSS.

Shared control должен пользоваться классом `foundation-token-focus` (или эквивалентным
семантическим focus-state), иметь цель не меньше `44 × 44 CSS px`, а необязательная анимация
должна отключаться в `prefers-reduced-motion: reduce`.

## Тема и постепенная миграция

`light` живёт в `:root`, а `dark` — в существующем class-based selector `.dark`. Режим `system`
по-прежнему разрешается в `src/App.tsx`, поэтому token layer не хранит и не меняет пользовательскую
настройку темы. Telegram variables и существующие product styles не являются частью этого слоя.

При новом UI change сначала используйте semantic role; перенос уже существующего экрана делайте
только в рамках его отдельного проверяемого change. Существующие Headless UI consumers не являются
неявными потребителями этого слоя и не мигрируются вместе с новым экраном.

## Glowy primitives

Новый public namespace — `src/components/ui/primitives/`. Импортируйте новый control из его
`index.ts`, а не из внутренних файлов:

```tsx
import { Button, Dialog, DialogContent, DialogTrigger, Field, Input } from "../components/ui/primitives";
```

| Группа | Public primitives | Граница использования |
| --- | --- | --- |
| Действия и форма | `Button`, `IconButton`, `Input`, `Textarea`, `Label`, `Field` | Native HTML props сохраняются; `IconButton` требует `aria-label`, а `Field` сам связывает label, description и error с control. |
| Surfaces и feedback | `Card`, `Badge`, `Skeleton`, `EmptyState`, `Alert`, `Toast` | `ToastProvider` размещается в конкретном feature subtree. Глобальный toast store намеренно отсутствует. |
| Overlay и выбор | `Dialog`, `Sheet`, `Popover`, `Select`, `Tabs`, `Tooltip` | Новые overlay/selection controls используют Radix. Root поддерживает controlled callbacks (`open`/`onOpenChange`, `value`/`onValueChange`), Escape и focus return обрабатывает Radix. |

Каждый primitive использует только semantic tokens, `foundation-token-focus` и минимум `44 × 44`
для интерактивной цели. Для Dialog и Sheet добавляйте доступные `Title` и `Description`; Sheet
сохраняет safe-area на компактных экранах. Не смешивайте эти Radix wrappers с Headless UI в одном
новом control и не заменяйте ими работающие legacy dialogs без отдельного OpenSpec change.

## Локальный Storybook-каталог

Storybook — только локальный каталог состояний, не product route. Он импортирует тот же CSS entry,
но не запускает PWA/service worker, `App`, stores или API clients. В toolbar выберите светлую или
тёмную тему и desktop либо compact ширину 390 px; accessibility addon показывает базовые проблемы
в Canvas каждой story.

```bash
# Открыть каталог локально на http://127.0.0.1:6006
npm run storybook

# Собрать локальный статический артефакт (storybook-static/ игнорируется Git)
npm run build-storybook

# Browser smoke: API isolation, Escape/focus return и touch target в desktop/mobile
npm run test:storybook

# Public API и accessibility associations
npm run test -- src/components/ui/primitives/primitives.test.tsx
```

Перед review shared primitive проверьте соответствующую story в light/dark и compact viewport,
откройте a11y panel и пройдите keyboard flow. Не публикуйте `storybook-static/`, не добавляйте его
в PWA и не подключайте внешний visual-regression service без решения владельца.

## Локальная showcase и visual baseline

Технический read-only экран находится на
`/__design-system/foundations?theme=light` или `?theme=dark`. Он не добавлен в пользовательскую
навигацию, не загружает авторизацию или product data и существует только для проверки tokens.

Проверить foundation локально:

```bash
npm run test -- src/design-system/tokens.test.ts src/design-system/FoundationShowcase.test.tsx
npx playwright test e2e/design-system-foundations.spec.ts
```

Первый запуск Playwright создаёт baseline screenshots в
`e2e/design-system-foundations.spec.ts-snapshots/`; они намеренно хранятся в репозитории. Для
осознанного обновления после визуального review:

```bash
npx playwright test e2e/design-system-foundations.spec.ts --update-snapshots
```

Не обновляйте baseline только ради зелёного CI: в review нужно явно сверить light и dark в desktop
и mobile, объяснить изменение semantic role и оставить обновлённые snapshots в том же change.
Текущие raster baseline записаны локальным Chromium на macOS и сравниваются на этой же платформе;
на Linux CI spec сохраняет все DOM/accessibility проверки, но не сравнивает raster, чтобы различия
рендеринга шрифтов не создавали ложные падения. Визуальный review следует выполнять локально по
сохранённым baseline.
