## Context

См. мотивацию в `proposal.md`. Сейчас `src/index.css` содержит только font theme, глобальные
scrollbar/autofill/motion-правила, а визуальные palette utility-классы, радиусы, тени и focus rings
повторяются непосредственно в React-компонентах. Темой управляет существующий `themeMode` в
`useSettingsStore`: `App.tsx` применяет класс `dark` к `html` и `body`; Telegram добавляет
изолированные `--tg-theme-*` variables. В проекте уже есть Tailwind CSS 4, Headless UI, Vitest и
Playwright; Storybook и visual-regression service не подключены.

## Goals / Non-Goals

**Goals:**

- Создать единый token layer, совместимый с Tailwind 4 и текущим class-based light/dark режимом.
- Сделать семантические визуальные решения проверяемыми статическими и browser-based tests.
- Подготовить foundation для следующих Radix/shadcn primitives и dashboard slice без преждевременной
  миграции существующих компонентов.

**Non-Goals:**

- Не выбирать или не подключать shadcn/Radix, Storybook либо облачную visual-regression платформу.
- Не заменять Headless UI и не менять `AppLayout`, страницы, API, data flow или Telegram theme
  contract в рамках этого change.
- Не превращать token showcase в пользовательский экран или вторую систему навигации.

## Decisions

### CSS custom properties как runtime source, semantic names как public contract

Создать отдельный foundation stylesheet, импортируемый из `src/index.css` после Tailwind base, с
двумя слоями значений:

- приватные primitive values для построения темы, если они нужны для читаемого вычисления;
- публичные semantic properties для ролей `canvas`, `surface`, `text`, `border`, `primary`,
  `accent`, `status`, `focus`, `radius`, `space`, `elevation` и `motion`.

`@theme inline` Tailwind 4 будет мостом между semantic CSS properties и utility usage там, где это
уместно. Компонентам запрещено зависеть от primitive palette names: только semantic names считаются
стабильным контрактом.

Альтернативы:

- оставить только Tailwind palette utility-классы — отклонено: роль цвета и тема продолжают
  дублироваться в каждом компоненте;
- хранить tokens только в TypeScript — отклонено: CSS theme, PWA и существующие utility-классы
  потребуют отдельной синхронизации;
- добавить runtime theme package — отклонено: для текущего class-based режима это новая зависимость
  без необходимой пользовательской ценности.

### Theme values поверх существующего class contract

Light значения определяются на корне, dark values — под существующим `.dark`; `system` продолжает
разрешаться текущим effect в `App.tsx`. Telegram variables не переименовываются и не становятся
источником глобальной темы: Telegram bootstrap может использовать их только в своих текущих
границах. Это сохраняет пользовательские настройки и Mini App compatibility.

### Данные token catalog и contrast validation остаются локальными

Рядом с stylesheet создать небольшой machine-readable catalog допустимых semantic pairings и
foundation states. Unit test вычисляет контраст из каталога и проверяет требуемые text/UI/focus
пороги; component/browser test проверяет focus и `prefers-reduced-motion`. Catalog и CSS values
сверяются тестом, чтобы два источника не расходились.

Альтернатива — ручной аудит в PR — отклонена: он не защищает foundation от случайной смены
контраста.

### Изолированная showcase и Playwright snapshots

Добавить минимальную read-only foundation showcase на техническом route, который не добавляется в
Sidebar, Header, BottomNav или пользовательские deeplink-подсказки. Route не загружает данные,
не требует auth и отображает только token states: surfaces, text, status, focus, motion и touch
target. Playwright откроет его на desktop и mobile, принудительно проверит light/dark class и
сохранит `toHaveScreenshot` baselines в репозитории.

Альтернативы:

- screenshot ключевых product screens — отложено: это должно прийти вместе с каждым product slice,
  иначе foundation change расширяется в массовый visual redesign;
- Storybook — отложено до следующего запланированного change;
- облачный сервис — отклонён roadmap без отдельного owner decision.

### Границы миграции

Foundation change добавляет token layer, документацию, showcase и tests. Допускаются только
минимальные global style updates, необходимые для включения layer; существующие product components
не переводятся на новые tokens. Первым потребителем будут отдельные primitives, а затем dashboard.

## Risks / Trade-offs

- [Semantic token names окажутся слишком общими или слишком мелкими] → зафиксировать ограниченный
  catalog ролей и расширять его только когда следующий primitive доказывает новую роль.
- [CSS catalog и machine-readable metadata разойдутся] → unit test сравнивает опубликованные
  semantic roles и значения перед visual checks.
- [Screenshot baseline окажется нестабильной между окружениями] → использовать фиксированные
  viewport, deterministic showcase, Chromium и локальные font assets; не включать даты, сеть,
  анимации или user data.
- [Hidden route станет случайно пользовательским surface] → не добавлять ссылки, не помещать
  продуктовую логику и удалить/заменить его Storybook в следующем foundation этапе.
- [Token layer незаметно изменит старые экраны] → ограничить global styles и проверить smoke
  desktop/mobile routes до merge; откатывать одним frontend commit без данных.

## Migration Plan

1. Добавить semantic CSS layer, Tailwind bridge, catalog и документацию без изменений product
   components.
2. Добавить deterministic showcase, unit/accessibility checks и локальные Playwright baselines.
3. Выполнить typecheck, lint, token/unit tests, focused desktop/mobile visual checks и production
   build; вручную убедиться, что light/dark/system и reduced motion не меняют существующие flows.
4. Rollback — revert change: состояние аккаунтов, Telegram, IndexedDB, backend и production
   конфигурация не изменяются.

## Open Questions

- Конкретные aesthetic values для semantic roles будут выбраны во время реализации по уже
  утверждённому направлению: спокойная структура «Тихой ясности», мягкая глубина «Спокойного
  космоса» и один акцент «Живого ритма». Это не изменяет набор ролей, accessibility thresholds или
  task breakdown.
