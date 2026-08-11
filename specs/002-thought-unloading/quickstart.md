# Quickstart Validation: Разгрузка мыслей

## Prerequisites

- Dependencies installed in root, `backend/` and `ai-proxy/`.
- Prisma Client generated locally.
- Local/dev env files configured with non-production values.
- Frontend, backend and AI proxy running in separate terminals.

## Automated checks

From repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Backend:

```bash
cd backend
npm run test
```

Optional browser smoke after Chromium is installed:

```bash
npx playwright test
```

## Manual scenario 1: ordinary question does not create a task

1. Open dashboard and note current task count.
2. In «Разгрузка мыслей», ask a normal question such as «Как немного восстановиться после
   тяжёлого дня?».
3. Expect a short Russian reply and no draft card when no concrete action is proposed.
4. Open tasks and confirm the count and contents did not change.

## Manual scenario 2: edit and confirm a task draft

1. Send «Нужно завтра ответить преподавателю».
2. Expect a reply plus an unsaved draft card.
3. Change the title and confirm.
4. Expect one success message, removal of the draft card and exactly one new task with the edited
   title.
5. Confirm the task is listed under recently added AI tasks.

## Manual scenario 3: edit a breakdown

1. Send «Нужно подготовить доклад: сначала собрать источники, потом сделать слайды».
2. Expect one main draft with two steps.
3. Rename one step, delete another and add a new step.
4. Confirm and verify one task with only the final selected steps.

## Manual scenario 4: reject and double-click safety

1. Produce a draft and choose the reject action; verify no task is created.
2. Produce another draft and rapidly click confirm twice.
3. Verify the action becomes disabled while saving and only one task appears.

## Manual scenario 5: errors and limits

1. With a pending draft, stop backend before confirmation.
2. Confirm and expect a Russian error while the editable draft remains visible.
3. Restart backend and retry successfully.
4. Verify an exhausted AI limit shows the existing limit message without changing tasks.

## Mobile verification

Repeat reply, edit, reject and confirm at widths 360, 390 and 430 px. Confirm no horizontal
scroll, hidden fields or overlapped actions.

## Privacy verification

- Inspect analytics calls: only `ai_draft_confirmed` is sent after consent and successful save.
- Inspect structured backend errors: no user message, AI reply, task title or step text is logged.
- Do not use production database, keys or user content for validation.

