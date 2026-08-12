# Quickstart Validation: Серверная история Glowy AI

## Safety prerequisites

- Use only a local or dedicated dev database.
- Do not run `prisma db push`, `prisma migrate reset` or `prisma migrate deploy`.
- Review the generated SQL migration separately; production application requires owner approval and
  a confirmed Timeweb backup.

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
cd backend
npm run test
```

## Local schema preparation

Generate the client only; this does not mutate a database:

```bash
cd backend
npx prisma generate
```

Apply the migration only to an explicitly configured disposable local/dev database through an
approved workflow. Never point this validation at production.

## Manual scenarios

1. Register two dev users A and B.
2. As A, open `/ai`, verify local legacy content is not uploaded, send a message and receive a reply.
3. Open A in another browser and verify the completed exchange appears.
4. Verify B cannot read or delete A's history.
5. Edit a local draft, confirm it once and verify the existing task flow still creates the task.
6. Clear A's history; verify it disappears on both sessions while confirmed tasks remain.
7. Simulate AI failure; verify no completed exchange or task is created and no private text is
   present in logs.
8. Start the app against a database without the new history tables. Verify chat sending, voice input,
   local draft editing and explicit task creation still work, while the UI reports that synchronization
   is temporarily unavailable.
