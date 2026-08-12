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
3. Open A in another browser and verify the completed exchange and pending draft appear.
4. Edit title, priority, energy and a subtask; reopen and verify persistence.
5. Confirm the draft twice from two browser sessions; verify exactly one task exists.
6. Verify B cannot read, edit, dismiss or confirm A's history/draft identifiers.
7. Clear A's history; verify it disappears on both sessions while confirmed tasks remain.
8. Simulate AI failure; verify no completed exchange, draft or task is created and no private text is
   present in logs.

