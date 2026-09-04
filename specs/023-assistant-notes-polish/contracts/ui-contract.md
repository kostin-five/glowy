# UI Contract

## Ассистент

- Desktop navigation link: `Ассистент` → `/ai`.
- Full page heading: `Ассистент`.
- Mobile center action is announced as opening the assistant.
- Page surface does not paint an opaque full-screen background over AppLayout wallpaper.

## Заметки

- `/notes` shows the list surface on mobile.
- `/notes/:noteId` shows the editor surface on mobile.
- Both surfaces remain present side by side from the large breakpoint.
- Saving failure leaves entered content visible.
- AI draft creation remains a two-step request + explicit confirmation flow.

