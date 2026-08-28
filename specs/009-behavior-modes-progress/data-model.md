# Data Model: Поведенческие режимы и честный прогресс

Новая таблица или колонка не требуется. Ниже описаны существующие persisted fields и новые вычисляемые представления.

## Behavior Mode

- `value`: `calm | moderate | strict` — существующее `User.aiTone`.
- `isDefault`: вычисляемо; true только для `calm`.
- `aiGuidance`: вычисляемые правила ответа.
- `xpPolicy`: вычисляемое правило completion.
- `overduePresentation`: вычисляемое UI-правило.

Transitions: пользователь явно переключает любое значение на другое; новое значение применяется к будущим AI-запросам и completion events, старые XP outcomes не пересчитываются.

## Task Completion Outcome

- `effect`: `awarded | withheld | deducted | unchanged`.
- `xpDelta`: signed integer; положительный, 0 или отрицательный.
- `xpAmount`: абсолютное значение delta.
- `reason`: `normal | overdue_blocker | already_processed`.
- `progress`: итоговые non-negative XP и level.

Rules:

1. Outcome создаётся только при переходе active → completed.
2. `Task.xpAwarded=true` после любой первой оценки policy, включая delta 0/negative.
3. XP не ниже 0; level пересчитывается из итогового XP.
4. Завершаемая задача исключена из overdue blocker query.

## Overdue Task

Вычисляемое состояние задачи:

- `completed=false`;
- `date` — непустой `YYYY-MM-DD`;
- `date < referenceDay`.

`referenceDay` для completion — подтверждённый `completedOn`; для карточки — локальный календарный today пользователя.

## Rhythm Calendar

- `month`: `YYYY-MM`, текущий или прошлый.
- `from`, `to`: границы полной недельной сетки, понедельник–воскресенье.
- `days[]`: `date`, `inMonth`, `state` (`active | rescued | missed | today | future | empty`).
- `canGoPrevious`, `canGoNext`: navigation flags.

State priority: `active` > `rescued` > `today` > `future` > `missed/empty`. Спасённый день никогда не маркируется как фактически выполненный.

## Rescue Eligibility

- `candidate`: только yesterday.
- `eligible`: yesterday не active/rescued, day-before-yesterday входит в streak set, есть remaining rescue.
- `monthlyUsage`: существующие `StreakRescue` по месяцу protected date.

Transitions: eligible → confirmed → rescued. Duplicate остаётся rescued без второго расхода. Ineligible запрос ничего не создаёт.

## Planned Duration

- Existing `Task.estimatedMinutes`: nullable integer 1–1440.
- UI representation: compact duration; absent value produces no placeholder.

## Relationships and ownership

- Behavior Mode принадлежит одному User.
- Task Completion Outcome относится к User и Task, но отдельно не сохраняется: durable guard — `Task.xpAwarded`, durable result — User XP/level.
- Rhythm Calendar строится только из Task/StreakRescue текущего authenticated User.
- Rescue остаётся unique по `(userId, protectedOn)`.
