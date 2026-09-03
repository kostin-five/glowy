# Data Model: Telegram SDK startup

Серверные сущности и база данных не меняются.

## SDK preparation attempt

- `idle`: Telegram context не требуется;
- `loading`: один активный script request, максимум 10 секунд;
- `ready`: найден валидный `TelegramWebApp`;
- `error`: загрузка, форма ответа или timeout неуспешны;
- `retry`: новый attempt после явного действия пользователя.

Attempt содержит только техническую фазу и поколение. Launch data, user data и токены не входят.

## Mini App tab marker

- key: `glowy_telegram_mini_app_tab`
- value: константа `1`
- storage: `sessionStorage`
- purpose: при reload safe route решить только вопрос загрузки SDK
- lifecycle: записывается после обнаружения launch data; недоступность storage допустима

Marker не является auth-доказательством и не заменяет backend session verification.

## Existing server session

Без изменений: backend валидирует `initData` и выдаёт существующую cookie session. Frontend не
выводит и не сохраняет payload дополнительно.
