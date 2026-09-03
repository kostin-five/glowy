# Data Model: Мобильная навигация заметок

## Server entities

Контракт `Note` не меняется. Новые таблицы, поля, миграции и API endpoints не требуются.

## Local UI state

### Производный `mobileEditorOpen: boolean`

- `false`: на mobile основная поверхность — список.
- `true`: на mobile основная поверхность — редактор.
- На desktop значение не скрывает ни одну поверхность.
- Вычисляется как `Boolean(noteId) || newNoteOpen`, поэтому сохранённая заметка следует URL без route-effect.

### `newNoteOpen: boolean`

- Единственное дополнительное page-state для ещё не сохранённой заметки без URL id.
- Сбрасывается при выборе существующей заметки, успешном возврате, архивировании и смене раздела.

### `SaveStatus`

Существующие значения сохраняются. `save()` возвращает признак безопасного завершения:

- пустой новый черновик → `true`, API не вызывается;
- успешный create/update → `true`;
- API error или более новая revision → `false`.

## State transitions

```text
list -> select existing -> editor + /notes/:id
list -> new -> blank editor + /notes
editor clean -> back -> list + /notes
editor dirty -> back -> saving -> success -> list
editor dirty -> back -> saving -> error -> editor
editor -> archive/restore success -> list + refreshed collection
```
