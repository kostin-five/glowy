# Архитектура Glowy

## Границы системы

```text
React + Vite frontend
  -> HTTPS API
Express backend
  -> Prisma (один общий клиент) -> PostgreSQL
  -> AI service/provider -> DeepSeek API
  -> YooKassa API
YooKassa webhook -> Express backend -> PostgreSQL
```

### Frontend

`src/pages/` собирает маршруты и экраны. `src/api/` отвечает за HTTP-вызовы, а `src/store/` -- за
клиентское Zustand-состояние. Общие UI-компоненты находятся в `src/components/`, чистые helpers --
в `src/utils/`. Браузер не получает ключи AI, YooKassa или базы данных.

### Backend и база

Express принимает запросы, применяет CORS, CSRF-проверку, `requestId` и маршруты. Prisma
импортируется только из `backend/lib/prisma.js`; это единственный клиент Prisma и пул соединений
для процесса. PostgreSQL хранит пользователей, задачи, подзадачи, платежи и состояние тарифов.

### AI

Маршруты в `backend/routes/ai.routes.js` передают работу в `backend/services/ai/`. Там находятся
provider, анализ Хаба мыслей, fallback и лимиты. Запросы к DeepSeek идут только с сервера; текст
задач и контекст не передаются в браузерные аналитические события.

### Оплата

Frontend запускает существующий checkout Focus через backend. Backend создаёт платёж в YooKassa,
сохраняет его и возвращает URL подтверждения. После оплаты YooKassa вызывает webhook; backend
повторно проверяет платёж у провайдера, сверяет допустимые значения и обновляет тариф пользователя.
Клиентская страница результата не является источником истины.

### Наблюдаемость и тесты

Каждому backend-запросу назначается серверный `X-Request-Id`. Ошибки пишутся структурированно без
тела запроса, cookies, токенов, email, содержимого задач или AI-сообщений. CI запускает typecheck,
lint, unit tests, build, браузерные smoke-тесты и изолированные backend HTTP-тесты. Тесты, которым
нужны данные Prisma, должны появиться только вместе с отдельной test DB.
