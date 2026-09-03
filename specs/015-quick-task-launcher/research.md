# Research: Глобальное быстрое создание задачи

## Decision 1 — Единственный владелец формы в защищённом layout

**Decision**: Рендерить один `GlobalTaskCreateLauncher` внутри `AppLayout` и убрать локальный экземпляр `CreateTaskModal` из `TaskPage`.

**Rationale**: Все защищённые маршруты уже проходят через layout. Один владелец исключает наложение dialog, расхождение draft state и дублирование сохранения.

**Alternatives considered**:

- Хранить modal на каждой странице — создаёт несколько lifecycle и повторяет wiring.
- Добавить состояние в Zustand — постоянный store не нужен для временного UI-флага.
- Менять маршрут на `/tasks?create=1` — нарушает требование сохранять исходный экран.

## Decision 2 — Типизированное UI-событие вместо нового контекста

**Decision**: Использовать один helper, который отправляет именованное browser event; layout слушает его и открывает modal.

**Rationale**: В проекте уже применяется тот же ограниченный pattern для mobile Glowy AI. Helper скрывает строковое имя, облегчает тесты и не создаёт новый provider вокруг всего приложения.

**Alternatives considered**:

- Новый React Context — допустим, но добавляет provider/API ради одного действия.
- Prop drilling из layout во все route elements — связывает маршрутизацию и страницы с UI-флагом.

## Decision 3 — Явные точки входа без глобальной горячей клавиши

**Decision**: Desktop использует Sidebar, обычный mobile — Header, page-вариант Glowy AI — собственный header, а TaskPage сохраняет FAB/empty-state.

**Rationale**: Действие видно, доступно касанием и клавиатурой и не перехватывает ввод. Оно сохраняет текущую информационную архитектуру и бренд.

**Alternatives considered**:

- Глобальная клавиша `N` — рискует конфликтовать с заметками и AI-чатом.
- Общий floating button на всех экранах — перекрывает chat composer и mobile navigation.
- Поместить действие только в «Ещё» — слишком скрыто для быстрого захвата.

## Decision 4 — Существующий modal остаётся источником task semantics

**Decision**: Launcher управляет только открытием/закрытием; validation, defaults, offline queue, account-scoped preferences и submit guard остаются в `CreateTaskModal` и task store.

**Rationale**: Это сохраняет проверенные контракты и делает rollback удалением точек входа без миграции данных.

**Alternatives considered**:

- Отдельная мини-форма — создаёт второй task contract и риск разных defaults.
- Inline quick add на каждой странице — повторяет validation и error handling.
