# Research: Независимый запуск Telegram SDK

## Decision 1: загружать SDK только в Telegram-контексте

**Decision**: убрать синхронный `<script>` из общего HTML и создавать его программно только для
`/telegram`, URL с Telegram launch-параметрами, уже доступного валидного WebApp или отмеченной
текущей Mini App-вкладки.

**Rationale**: обычный сайт перестаёт зависеть от внешнего домена. Официальная интеграция всё ещё
получает `window.Telegram.WebApp` из текущего источника, как описано в документации Telegram:
https://core.telegram.org/bots/webapps#initializing-mini-apps.

**Rejected**: глобальный `async`/`defer` script. Он продолжает делать внешний запрос на каждой
web-странице и требует гонок поздней инициализации во всех потребителях.

## Decision 2: provider является SDK gate

**Decision**: разместить существующий provider внутри `BrowserRouter`, чтобы он видел текущий route,
показывал отдельное состояние подготовки и отдавал children только после готовности либо когда SDK
не требуется.

**Rationale**: Telegram consumers не фиксируют `null` до поздней загрузки, а обычные маршруты не
получают задержки. Auth API и context contract не меняются.

**Rejected**: загрузка в каждой странице или API client — это параллельные Telegram/auth-механизмы.

## Decision 3: 10-секундная попытка и явный retry

**Decision**: module-level loader разделяет одну активную Promise, проверяет форму WebApp, очищает
listeners/timer и разрешает новую попытку после error/timeout. Gate показывает текущий знак Glowy,
доступный статус и русскую кнопку `Повторить`.

**Rationale**: зависание становится конечным, понятным состоянием; двойной клик не создаёт второй
script request.

**Rejected**: автоматические бесконечные повторы скрывают состояние сети и создают лишнюю нагрузку.

## Decision 4: сохранять только факт вкладки

**Decision**: после валидного запуска хранить в `sessionStorage` только константный marker текущей
вкладки. Значения launch URL и `initData` не читаются для marker и не копируются.

**Rationale**: при reload уже на safe target SDK готовится снова без нового хранилища закрытых данных.

**Rejected**: внутренние Telegram storage keys или сохранение `initData` нарушают минимизацию данных.

## Decision 5: поздний backend restore не применяет сессию

**Decision**: перед `complete` проверять `AbortSignal`. Abort остаётся основным механизмом отмены,
guard закрывает случай, когда нестандартный клиент всё равно разрешает Promise.

## Open Questions

Нет вопросов, меняющих границу реализации. Live-проверка в Telegram остаётся ручной приёмкой.
