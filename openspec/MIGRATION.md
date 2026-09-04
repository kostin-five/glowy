# Миграция Spec Kit → OpenSpec

## Статус источников

- `openspec/specs/` — единственный активный канонический baseline текущих возможностей Glowy.
- `openspec/changes/` — предложения, delta-specs, design и tasks для незавершённых изменений.
- `.specify/` и корневой `specs/` — исторический read-only слой. Он объясняет решения на дату
  релиза, но не используется для создания новых изменений.
- `.specify/memory/constitution.md` и `AGENTS.md` остаются обязательными правилами проекта.
- `docs/product-roadmap.md` описывает направление и не доказывает, что функция реализована.

Если main spec расходится с кодом, расхождение нельзя исправлять молча. Нужно создать OpenSpec
change и решить, что корректировать: реализацию или requirement.

## Current и planned

В main specs попадает только наблюдаемое текущее поведение, подтверждённое кодом, тестами и
актуальным handoff. Запланированное поведение сначала оформляется delta-spec внутри change и
становится частью main specs после успешных apply, verify и archive. Датированные release notes и
handoff не переписываются задним числом.

## Карта исторических specifications

Карта показывает, где искать актуальный контракт. Она не утверждает, что каждое старое требование
до сих пор действует без изменений.

| Исторический каталог | Канонические capabilities |
| --- | --- |
| `001-quality-baseline` | `platform-quality` |
| `002-thought-unloading` | `ai-assistant`, `tasks-subtasks` |
| `003-mobile-glowy-ai` | `ai-assistant`, `platform-quality` |
| `004-ai-founder` | `ai-assistant`, `subscriptions-payments` |
| `005-personal-progress-analytics` | `account-auth`, `tasks-subtasks`, `progress-analytics` |
| `006-offline-mode` | `offline-sync`, `tasks-subtasks` |
| `007-smart-notes` | `notes`, `ai-assistant`, `tasks-subtasks` |
| `008-telegram-mini-app` | `telegram`, `account-auth` |
| `009-behavior-modes-progress` | `account-auth`, `tasks-subtasks`, `progress-analytics` |
| `010-mobile-ui-report-polish` | `platform-quality`, `tasks-subtasks`, `progress-analytics`, `subscriptions-payments` |
| `011-forever-unification` | `subscriptions-payments` |
| `012-contracts-observability` | `platform-quality`, `ai-assistant`, `account-auth` |
| `013-backend-typescript-migration` | `platform-quality` |
| `014-task-capture-fields` | `tasks-subtasks` |
| `015-quick-task-launcher` | `tasks-subtasks` |
| `016-readable-ai-dialog` | `ai-assistant` |
| `017-mobile-notes-navigation` | `notes`, `platform-quality` |
| `018-analytics-request-isolation` | `progress-analytics`, `account-auth` |
| `019-nonblocking-telegram-sdk` | `telegram`, `platform-quality` |
| `020-confirmable-day-plan` | `ai-assistant`, `tasks-subtasks` |
| `021-task-planning-tools` | `ai-assistant`, `tasks-subtasks` |
| `022-background-personalization` | `account-auth`, `platform-quality` |
| `023-assistant-notes-polish` | `ai-assistant`, `notes` |
| `024-documentation-handoff-refresh` | `platform-quality` |

## Новый lifecycle

1. `/openspec-explore` — read-only исследование, когда нужно понять проблему.
2. `/openspec-propose` — proposal, delta-specs, design и tasks без реализации.
3. Review пользователя — обязательная новая команда перед apply.
4. `/openspec-apply-change` — реализация и отметка фактически выполненных задач.
5. `/openspec-verify-change` — сверка требований, сценариев, design и проверок.
6. `/openspec-archive-change` — перенос дельт в main specs и исторический архив.

`/openspec-update-change` меняет уже созданные planning artifacts, а
`/openspec-sync-specs` применяется только осознанно, когда main specs нужно синхронизировать до
archive.
