# Data Model: Backend TypeScript Migration

В этой версии не меняются PostgreSQL schema, Prisma models или пользовательские данные. Ниже описана модель контроля самой миграции; она хранится в Git-документах и проверках, а не в базе данных.

## Migration Inventory Item

- `path`: уникальный tracked путь исходного `.js` файла.
- `category`: `runtime-support` или `test`.
- `domain`: существующий backend-домен.
- `status`: `pending`, `converted`, `excluded`.
- `slice`: идентификатор владеющего среза.
- `exception`: необязательное обоснование; не может скрывать core backend в финальном gate.

**Invariant**: каждый из 95 исходных файлов встречается ровно один раз; к релизному gate все имеют `converted`.

## Migration Slice

- `id`: стабильное имя среза.
- `scope`: ограниченный список файлов/модулей.
- `behaviorChange`: всегда `false` для механического переноса.
- `entryChecks` и `exitChecks`: обязательные проверки.
- `rollbackBoundary`: самостоятельный diff/commit.
- `risk`: `low`, `medium`, `high`; auth/payments/AI/Telegram не могут быть `low`.

**State transitions**: `planned → in_progress → verified`; при провале — `in_progress → rolled_back` или исправление внутри того же среза.

## Verification Evidence

- `sliceId`, `command`, `result` (`passed`, `failed`, `not_run`).
- `summary`: результат без пользовательских payloads.
- `riskNote`: остаточный риск или причина пропуска.

## Type Exception

- `location`, `kind`, `reason`, `containment`, `removalCondition`.

**Invariant**: широкие suppressions, `@ts-nocheck` и недокументированные `any` запрещены.

## Runtime Artifact

- `sourceRoot`: `backend/`.
- `outputRoot`: `backend/dist/`.
- `entrypoint`: `dist/server.js`.
- `moduleFormat`: Node.js ESM.
- `tracked`: `false`.

**Invariant**: artifact воспроизводим из tracked source и lockfile; `dist` не редактируется вручную.
