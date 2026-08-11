# Quickstart Validation: Мобильный Glowy AI

## Automated checks

From repository root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If the existing AI contract is touched, also run:

```bash
cd backend
npm run test
```

## Manual scenario 1: navigation and quick sheet

For each width 360, 390 and 430 px:

1. Open an authenticated protected page.
2. Confirm the order: «Главная», «Задачи», «Glowy AI», «Мой прогресс», «Ещё».
3. Confirm no horizontal scroll and no overlap with page actions.
4. Press the central orb and verify one bottom sheet opens over the same route.
5. Close by button, backdrop and Escape; verify focus returns to the orb.

## Manual scenario 2: safe AI flow

1. Open the quick sheet and send an ordinary question.
2. Verify a reply appears and tasks do not change.
3. Send a concrete action, edit the returned draft and reject it; verify no task is created.
4. Produce another draft, confirm it and verify exactly one task is created.
5. Disconnect the network and verify a calm Russian error without data mutation.

## Manual scenario 3: full chat

1. Start a conversation in the quick sheet.
2. Select «Открыть полный чат».
3. Verify route `/ai`, the sheet is closed and current messages remain visible.
4. Continue the conversation and confirm a draft using the same flow.
5. Use browser Back and verify no stale backdrop remains.

## Manual scenario 4: progress and More

1. Select «Мой прогресс» and verify the existing progress page opens.
2. Select «Ещё» and verify «Аналитика» and «Настройки».
3. Open each link and verify the sheet closes.

## Visual and accessibility checks

- Test light and dark themes.
- Enable reduced motion and confirm the orb has no continuous decorative movement.
- Open the mobile keyboard and confirm the composer remains reachable.
- Navigate with keyboard: focus must stay inside an open sheet and return to the trigger on close.
- At desktop width confirm BottomNav/sheets are hidden and dashboard/Sidebar remain unchanged.

## Privacy and scope

- Do not use production data or keys.
- Do not log or inspect user message content outside the visible test conversation.
- Confirm no changes to Landing Page, backend schema, production env or deploy configuration.
- Voice input and server-side chat history are intentionally not part of this feature.

## Implementation verification (2026-08-12)

- Shared conversation migration/state, quick chat safety, explicit confirmation, navigation order,
  central orb, Escape close, More destinations and protected `/ai` are covered by component tests.
- Typecheck, lint and production build pass on the implementation branch.
- The public local app and auth boundary were smoke-tested in the in-app browser. The protected
  mobile viewport scenarios remain pending because that browser has no authenticated local
  session; no test user or dev-database record was created to bypass this boundary.
