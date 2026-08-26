# Quickstart validation: Умные заметки

## Safety prerequisite

Do not run migration commands against dev or production. For local manual DB
validation, use a disposable database only after configuring it explicitly.

## Automated checks

From the repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

From `backend/`:

```bash
npm test
```

Backend HTTP tests remain database-free and use a mocked shared Prisma client.

## Manual acceptance path

1. Sign in, open «Ещё» → «Заметки», verify the first-note empty state.
2. Create a note, edit title/text, wait for «Сохранено», reload and compare.
3. Search by title and body with different case; verify the no-results state.
4. Archive and restore the note.
5. Link an owned task, navigate note → task → note, then remove the link.
6. Select a note fragment, request a task draft, edit and cancel it; verify no
   task exists.
7. Request again and confirm; verify exactly one task and reciprocal link.
8. Repeat direct API reads/links with a second account's identifiers; verify no
   private content is disclosed.
9. Simulate provider failure/offline and confirm that note content remains in
   the editor, no task is created and the message is in Russian.

## Migration review

Review generated SQL for additive statements only. Applying it to any shared
environment is a separate owner-approved operation requiring a confirmed
Timeweb backup for production.

## Verification result — 2026-08-26

- Prisma schema validation: passed.
- `git diff --check`: passed.
- Frontend typecheck and lint: passed.
- Frontend tests: 79/79 passed.
- Production frontend build: passed, including the lazy Notes page and PWA shell.
- Backend tests: 58/58 passed, including ownership, draft-only AI and atomic confirmation.
- Manual database-backed flow: not run because the approved migration file was
  deliberately not applied to any database.
