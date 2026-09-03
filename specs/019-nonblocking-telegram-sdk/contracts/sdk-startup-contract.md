# UI Contract: Telegram SDK startup

## Context decision

`needsTelegramSdk(location)` возвращает `true`, только для `/telegram`, имени известного Telegram
launch-параметра в search/hash, уже доступного WebApp с launch data или marker текущей вкладки.
Результат не подтверждает личность и не разрешает вход.

## Loader contract

`loadTelegramSdk()` переиспользует валидный WebApp, разделяет одну активную Promise, создаёт один
script с текущим официальным URL и завершается ошибкой при network error, неправильной форме global
или через 10 секунд. После ошибки разрешён новый attempt; поздние callbacks старого поколения
игнорируются. Launch data не логируются и не сохраняются.

## Gate states

- `loading`: `role=status`, текущий знак Glowy, русский текст подготовки;
- `error`: русский текст, `role=alert`, активная кнопка `Повторить`;
- ordinary web: children немедленно, без Telegram UI/request;
- ready без launch data: bootstrap показывает текущее приглашение и не вызывает session endpoint.

## Backend boundary

API не меняется: `POST /api/telegram/mini-app/session` получает существующий `initData` из WebApp и
остаётся единственной точкой автоматического восстановления личности.
