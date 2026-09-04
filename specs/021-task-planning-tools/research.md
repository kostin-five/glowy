# Research: Инструменты планирования задач

- Текущие статус, поиск и сортировка уже централизованы в `useTaskStore`/`useProcessedTasks`; дополнительные session-only условия безопаснее передать в pure helper, не расширяя persisted user state.
- Обе формы уже поддерживают ручные подзадачи и показывают заглушку «AI шаги»; общий draft editor устраняет дублирование UI.
- `POST /api/ai/mind-hub` и note task draft уже задают правильный шаблон: backend auth, reservation/release, provider layer, graceful errors и usage accounting.
- Новая схема БД не нужна: результат AI временный, а подтверждённые элементы используют существующий SubTask API.
