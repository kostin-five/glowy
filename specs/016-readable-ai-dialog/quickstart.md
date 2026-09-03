# Quickstart: Проверка понятного диалога Glowy AI

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test -- src/store/useMindHubStore.test.ts src/components/mind/MindHubChat.test.tsx
npm run build
```

Run the relevant existing Playwright smoke suite after the focused checks.

## Manual page scenario

1. Open `/ai` with an empty local conversation.
2. Confirm three starter actions are visible.
3. Choose each action: the composer is filled/focused, but no request is sent until submit.
4. Send a request that returns a task draft.
5. Confirm no task exists before `Добавить задачу`.
6. Confirm the draft and verify a result card appears; its action opens `/tasks`.

## Clear and legacy scenarios

1. Open clear confirmation, cancel it and verify messages/drafts remain.
2. Open it again, confirm and verify messages/drafts disappear while tasks remain.
3. Load an old `role/text` local message without optional metadata and verify the page renders it.
4. Switch to another account in the same browser and verify the first account's messages and drafts are not displayed; switch back and verify they return.
5. In a long conversation, scroll upward, receive/add a new message and use `Перейти к новым сообщениям`.

## Responsive scenario

Repeat the empty state, composer, linked card and clear confirmation at 320, 360, 390 and 430 px in both browser mobile emulation and Telegram Mini App. There must be no horizontal overflow or covered action.

## Rollback check

After reverting the feature commit, base `id/role/text` messages and all tasks remain valid; only optional UI metadata is ignored.
