# Implementation Plan: Поведенческие режимы и честный прогресс

**Branch**: `codex/v2.8.0-stabilization-behavior` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-behavior-modes-progress/spec.md`

## Summary

Расширить существующее профильное поле `aiTone` до полноценного режима поведения без смены его сохранённых значений. Один общий backend-policy вычисляет подписанный исход XP для HTTP и Telegram; offline использует тот же task endpoint и после синхронизации принимает серверный прогресс. Существующие task duration и progress tables переиспользуются. Progress API получает календарный срез выбранного месяца, а rescue-policy допускает только вчерашний разрыв после активного позавчерашнего дня. Миграция не требуется.

## Technical Context

**Language/Version**: TypeScript 5.9 + React 19 frontend; Node.js 22 LTS-compatible ESM JavaScript backend

**Primary Dependencies**: React Router, Zustand, Zod, Axios, Express 5, express-validator, Prisma 7, PostgreSQL, existing AI provider layer

**Storage**: Existing PostgreSQL `User.aiTone`, `User.xp`, `User.level`, `Task.date`, `Task.estimatedMinutes`, `Task.xpAwarded`, `Task.completedOn`, `StreakRescue`; existing IndexedDB offline task snapshot/queue. No schema change.

**Testing**: Vitest + Testing Library, Node test runner backend suites, Playwright desktop/mobile/offline regression, Prisma schema validation

**Target Platform**: Modern web/PWA at 320 px and wider, Telegram Mini App, Express backend on current dev/production platforms

**Project Type**: React web/PWA + Express API in one repository

**Performance Goals**: Mode save confirmed within 3 seconds; task completion remains one request/transaction; calendar month renders without perceptible delay and without loading unbounded task text.

**Constraints**: Russian UI; no `LandingPage.tsx` change; no new auth/AI/database architecture; all XP decisions on backend; no secrets or task text in logs; offline queue preserved; user data isolated; no production migration/deploy/env changes.

**Scale/Scope**: Three existing modes, HTTP/offline/Telegram completion paths, task cards, AI chat/task analysis/analytics insight, one monthly streak calendar, current rescue endpoint.

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **User value and control — PASS**: Mode selection is explicit and reversible. Strict consequences are described before selection; rescue requires confirmation; AI does not mutate tasks.
- **Existing architecture — PASS**: Reuses `aiTone`, Task API, shared completion service, AI provider, progress routes, Prisma client and offline queue. No parallel data store or provider.
- **Data/security — PASS**: XP and entitlement-sensitive behavior are decided on backend. Queries remain user-scoped; logs expose neither task names nor prompts. No migration or production access.
- **Evidence — PASS**: Pure policy, API, UI, offline, Telegram and mobile calendar tests are planned, plus full regression.
- **Collaboration — PASS**: Russian copy, additive response fields, compatibility of existing mode identifiers and focused commits are preserved.

## Project Structure

### Documentation (this feature)

```text
specs/009-behavior-modes-progress/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── routes/
│   ├── task.routes.js
│   └── progress.routes.js
├── services/
│   ├── ai/mind-hub.service.js
│   ├── analytics/analytics.service.js
│   ├── progress/progress.service.js
│   └── tasks/task-completion.service.js
└── test/

src/
├── api/
├── components/
│   ├── profile/ProfilePreferencesPanel.tsx
│   ├── progress/StreakPanel.tsx
│   └── tasks/TaskItem.tsx
├── constants/profile.ts
├── offline/
├── store/
├── types/index.ts
└── utils/

e2e/
├── offline.spec.ts
└── personal-progress.smoke.spec.ts
```

**Structure Decision**: Сохраняется текущая web/backend структура. Чистые правила XP и календаря выделяются в существующие доменные services/helpers, а routes и UI остаются тонкими потребителями.

## Design Decisions

### 1. Совместимый режим поведения

Публичные сохранённые значения `calm | moderate | strict` и поле `aiTone` сохраняются, чтобы не нужна была миграция и старые клиенты продолжили работать. В UI настройка называется «Как Glowy помогает мне действовать», а тексты объясняют AI, XP и просрочку. Спокойный помечен «По умолчанию».

### 2. Единый policy исхода XP

Чистая функция получает режим, параметры награды, признак другого overdue task и текущий XP. Она возвращает signed delta, effect и безопасный reason code. HTTP route и Telegram completion вызывают одну функцию внутри своей существующей транзакции. `xpAwarded` остаётся одноразовым guard и означает, что XP-policy для завершения уже применён, даже если delta равна нулю или отрицательна.

### 3. Просрочка без нового времени суток

Просрочка определяется только контрактом `YYYY-MM-DD`: активная задача с непустой `date < completedOn`, где `completedOn` — уже существующая валидированная локальная дата клиента. Завершаемая задача исключается из blockers. Поле `estimatedMinutes` остаётся длительностью и показывается отдельным chip; время начала/дедлайн внутри дня не вводится.

### 4. Календарный срез progress

`GET /api/progress` принимает необязательный `month=YYYY-MM`, не позже месяца `today`. Ответ сохраняет текущие поля и добавляет bounded календарь из 35–42 date cells для полной недельной сетки выбранного месяца. Состояния вычисляются сервером из user-scoped completion/rescue dates; дни до `User.createdAt` остаются нейтральными, а frontend отвечает за доступное представление и навигацию.

### 5. Rescue только вчера

Pure rescue eligibility проверяет ровно `yesterday`: он отсутствует в activity/rescue set, `dayBeforeYesterday` входит в streak set, и лимит текущего месяца доступен. Route повторяет проверку внутри transaction. Старые dates отклоняются независимо от клиента.

### 6. Offline и обратная совместимость

Offline UI может показать локальный предварительный исход, вычисленный из локального режима и снимка, но не создаёт отдельную XP-очередь. Task mutation синхронизируется существующей очередью; серверный task response/progress окончательно выравнивает XP. Старый `xpReward` сохраняется как signed delta, а новый `xpOutcome` объясняет эффект.

## Post-Design Constitution Check

- Все пять gates остаются **PASS**.
- Новая Prisma migration, production DB, env, тарифные или payment-изменения отсутствуют.
- Единственная осознанная жёсткость — opt-in signed XP policy; она прозрачна, ограничена одним completion event, не создаёт отрицательный XP и не использует унижающий copy.

## Complexity Tracking

Конституционных нарушений, требующих исключения, нет.
