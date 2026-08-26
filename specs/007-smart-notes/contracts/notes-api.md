# Contract: Notes API v2.7.0

All endpoints require the existing authenticated session. Foreign or missing
resources return the same non-disclosing `404` response.

## Notes

- `GET /api/notes?archived=false&query=` → `200 NoteSummary[]`
- `POST /api/notes` with `{ title, content }` → `201 NoteDetail`
- `GET /api/notes/:id` → `200 NoteDetail`
- `PUT /api/notes/:id` with any of `{ title, content, archived }` → `200 NoteDetail`

`NoteSummary` contains `id`, `title`, a bounded preview, `archived`, timestamps
and linked task summaries. `NoteDetail` contains full content and linked task
summaries. Validation errors are `400` with safe Russian messages.

## Task links

- `POST /api/notes/:id/task-links` with `{ taskId }` → `201 NoteTaskLink`
- `DELETE /api/notes/:id/task-links/:taskId` → `200 { message }`

Creation verifies that both note and task belong to the authenticated user.
Repeated creation is idempotent and returns the existing link.

Task list/detail representations may include `noteLinks: [{ note: { id, title,
archived } }]` so the existing task UI can navigate back to notes.

## AI draft and confirmation

- `POST /api/notes/:id/task-draft` with `{ fragment }` →
  `200 { draft, limit }`
- `POST /api/notes/:id/tasks` with editable task fields →
  `201 { task, link }`

The draft endpoint accepts 1–4 000 trimmed characters, verifies note ownership,
uses current authenticated AI limits and never creates data. Confirmation does
not call AI; it validates the edited task through the existing task contract and
creates exactly one task plus its note link in one transaction.

Expected failures: `400` invalid input, `401` unauthenticated, `404` inaccessible
entity, `429` AI limit, `503/502` provider unavailable. Error bodies never echo
the note or selected fragment.
