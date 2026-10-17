# Маршруты HTTP API

Маршруты определены в `backend/app.ts` и `backend/routes/`. Тест
`backend/test/endpoint-inventory.test.ts` сверяет этот перечень с зарегистрированными
обработчиками. Форматы запросов, права доступа и ошибки проверяются отдельными тестами.

| Метод и путь |
| --- |
| `POST /api/auth/register` |
| `POST /api/auth/login` |
| `POST /api/auth/logout` |
| `GET /api/auth/me` |
| `GET /api/tasks` |
| `POST /api/tasks` |
| `PUT /api/tasks/:id` |
| `DELETE /api/tasks/:id` |
| `GET /api/subtasks/:taskId` |
| `POST /api/subtasks` |
| `PUT /api/subtasks/:id` |
| `DELETE /api/subtasks/:id` |
| `GET /api/ai/usage` |
| `POST /api/ai/analyze` |
| `POST /api/ai/mind-hub` |
| `POST /api/ai/subtask-draft` |
| `POST /api/chat` |
| `POST /api/payments/yookassa/webhook` |
| `GET /api/payments/current-plan` |
| `POST /api/payments/focus/create` |
| `POST /api/payments/forever/create` |
| `POST /api/payments/forever/activate` |
| `GET /api/analytics` |
| `POST /api/analytics/insight` |
| `GET /api/progress` |
| `POST /api/progress/rescues` |
| `POST /api/progress/habits` |
| `PATCH /api/progress/habits/:id` |
| `PUT /api/progress/habits/:id/checks/:date` |
| `DELETE /api/progress/habits/:id/checks/:date` |
| `DELETE /api/progress/habits/:id` |
| `GET /api/user/preferences` |
| `PATCH /api/user/preferences` |
| `GET /api/user/progress` |
| `PUT /api/user/energy` |
| `DELETE /api/user/account` |
| `GET /api/notes` |
| `POST /api/notes` |
| `GET /api/notes/:id` |
| `PUT /api/notes/:id` |
| `POST /api/notes/:id/task-links` |
| `DELETE /api/notes/:id/task-links/:taskId` |
| `POST /api/notes/:id/task-draft` |
| `POST /api/notes/:id/tasks` |
| `POST /api/telegram/mini-app/session` |
| `POST /api/telegram/mini-app/register` |
| `POST /api/telegram/mini-app/login` |
| `POST /api/telegram/webhook` |
| `GET /api/user/telegram` |
| `POST /api/user/telegram/link-code` |
| `DELETE /api/user/telegram` |
| `GET /api/health` |
