# Дизайн-система Glowy: foundations

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

Первым потребителем foundation будут следующие отдельные changes для primitives и dashboard. При
новом UI change сначала используйте semantic role; перенос уже существующего экрана делайте только
в рамках его отдельного проверяемого change. Не заменяйте им Headless UI, не добавляйте Storybook и
не публикуйте технический экран пользователям без отдельного решения.

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
