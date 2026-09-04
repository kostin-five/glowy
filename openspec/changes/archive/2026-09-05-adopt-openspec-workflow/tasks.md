## 1. OpenSpec tooling

- [x] 1.1 Закрепить `@fission-ai/openspec` как точную devDependency, добавить npm scripts для
  status и strict validation, восстановить минимальный порядок `package.json` и проверить
  `npm ls @fission-ai/openspec zod`.
- [x] 1.2 Заполнить `openspec/config.yaml` контекстом Glowy, правилами proposal/design/specs/tasks
  и guidance для apply/archive; проверить результат командой `npm run openspec:context`.
- [x] 1.3 Оставить полный набор OpenSpec skills в `.agents/skills`, удалить конкурирующие активные
  Spec Kit skills и проверить список каталогов skills без удаления `.specify/` или `specs/001-*`…
  `specs/024-*`.

## 2. Канонический baseline

- [x] 2.1 Создать `openspec/MIGRATION.md` с иерархией источников, правилами current-vs-planned и
  картой всех 24 исторических specs на канонические capabilities; проверить полноту списка.
- [x] 2.2 Создать и строго валидировать baseline specs `account-auth` и `tasks-subtasks`, сверив
  requirements и scenarios с текущими routes, API clients, stores и тестами.
- [x] 2.3 Создать и строго валидировать baseline specs `ai-assistant`, `notes` и
  `progress-analytics`, не перенося в current behavior идеи из roadmap.
- [x] 2.4 Создать и строго валидировать baseline specs `offline-sync`, `telegram` и
  `subscriptions-payments`, сохранив подтверждение действий AI/бота и backend authority.
- [x] 2.5 Создать и строго валидировать baseline spec `platform-quality`, включив действующие
  границы observability, privacy, контрактов и проверок без фиксации конкретного CI-провайдера.

## 3. Живые инструкции проекта

- [x] 3.1 Перевести `AGENTS.md` и `.specify/memory/constitution.md` на lifecycle OpenSpec,
  обновить semantic version конституции и проверить, что обязательные product/security/release
  принципы не ослаблены.
- [x] 3.2 Обновить developer onboarding, `NEXT_CHAT_PROMPT`, актуальный handoff, architecture,
  docs index и roadmap; проверить поиском, что живые инструкции больше не предписывают Spec Kit,
  а датированная история осталась неизменной.

## 4. Проверка миграции

- [x] 4.1 Выполнить `npm run openspec:validate`, `openspec doctor` и `git diff --check`; исправить
  все ошибки структуры, ссылок и формата.
- [x] 4.2 Выполнить frontend typecheck, lint, unit tests и production build; отдельно проверить
  production dependency audit без devDependencies и зафиксировать все нерешённые findings без
  автоматического `npm audit fix`.
- [x] 4.3 Проверить migration change через `openspec-verify-change`, устранить критические
  расхождения и подготовить change к review перед archive без push или deploy.
