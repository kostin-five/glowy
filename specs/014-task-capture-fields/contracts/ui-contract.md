# UI Contract: Task capture and field modes

## Mode labels and visible sections

| Mode | Russian label | Initially visible |
| --- | --- | --- |
| `compact` | Коротко | Title; expand action |
| `medium` | Средне | Title; date; estimated time; category; enabled energy/priority |
| `full` | Полно | All medium fields; actual time on edit; subtasks; existing supported details |

Energy and priority visibility is applied after the mode. `compact` hides both in the initial surface; expanding details shows only fields enabled by preference. `full` respects an explicit user choice to hide energy or priority while preserving their draft values.

## Create contract

1. Opening focuses the title field.
2. Submit is disabled or rejected while trimmed title is empty.
3. One submit produces at most one store mutation while pending.
4. Failure keeps every draft value and exposes a retry.
5. Cancel/backdrop/Escape creates nothing.
6. Success closes the dialog, resets its draft and selects active tasks.

## Edit contract

1. Opening starts with the complete existing Task values regardless of visibility.
2. Changing mode never modifies values.
3. Saving while energy/priority are hidden preserves their existing values.
4. Failure keeps the dialog and draft open.
5. Subtask actions remain available in full mode and keep current explicit mutations.

## Responsive dialog contract

- Desktop: centered panel, maximum viewport height, internal vertical scroll, visible title and close action.
- Mobile 320–430 px: bottom-aligned sheet, drag-handle presentation, safe-area padding, internal vertical scroll, actions reachable above bottom navigation/keyboard.
- Both: focus trap, Escape dismissal when not submitting, labelled dialog, return focus to opener, no horizontal overflow.

## Preference contract

- Defaults: `medium`, energy visible, priority visible.
- Invalid persisted values fall back independently to defaults.
- Preferences are isolated by current account on the device.
- Preference changes affect future form openings; switching mode inside an open draft affects only that draft until explicitly chosen as default in Settings.

## AI boundary

- No new AI request is made by this slice.
- Any existing AI-originated TaskDraft remains visibly a draft.
- No create/update mutation occurs before the user's explicit confirmation.
