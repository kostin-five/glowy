# UI Contract: Mobile Notes Navigation

## Mobile list

- Route: `/notes`
- Visible: heading, search, active/archive tabs, note list, `Новая заметка`.
- Hidden: note editor.

## Mobile editor

- Route: `/notes/:id` for saved notes; `/notes` for an unsaved new note.
- Visible: `Назад к заметкам`, save state, archive action when applicable, title, content and existing task actions.
- Hidden: list and duplicate page heading.

## Back behavior

1. While `saving`, back is disabled.
2. For `dirty` or `error`, await existing create/update.
3. On success, reset editor UI and navigate to `/notes`.
4. On failure, remain in editor and expose the save error.
5. An empty unsaved note closes without a create request.

## Desktop compatibility

At `lg` and wider, both list and editor remain visible in the existing two-column layout. The mobile back action is hidden.
