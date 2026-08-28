# Contract: UI behavior

## Главная

- Sections: `Фокус дня`, `Сегодня`, `Недавно добавлено`.
- Card: priority, energy accent, date, optional duration/category, `completed/total` subtasks.
- Нет checkbox, DnD, delete, edit, add/toggle subtask. Переход в Tasks — отдельная ссылка блока.

## Collapsed sidebar

- Доступны enlarged logo, expand, avatar, logout.
- Route items отсутствуют из tab order и DOM.
- Expanded state сохраняет links; `Пункт управления` заменяется на `Главная`.

## Tasks и bulk

- На 320 px полностью видны tabs `Активные`, `Выполненные`, `Все` с counts.
- Bulk actions: `Выполнить`, `На завтра`, `Перенести`, `Удалить`, `Отмена`; `Снять` отсутствует.
- `Перенести` открывает accessible date confirmation; partial failure оставляет failed selected.

## Pricing

- Display `Forever`; CTA disabled `Скоро`.
- Existing internal Founder может видеть `Активен бессрочно`.
- Query/click не вызывает founder activation API.

