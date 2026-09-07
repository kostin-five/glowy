## Purpose

Определяет ограниченный набор доступных и тематически согласованных UI-primitives, на которых новые
сценарии Glowy могут строиться без повторения локальных кнопок, полей, overlays и feedback-состояний.

## ADDED Requirements

### Requirement: Семантические базовые controls и surfaces

Frontend SHALL предоставлять документированные Glowy primitives для действий, иконок, ввода текста,
label/field, карточек и badges. Они MUST использовать semantic design tokens, поддерживать light и
dark theme contract и передавать нативные HTML-атрибуты, нужные form и assistive technologies.

#### Scenario: Новый form использует text control
- **WHEN** разработчик добавляет поле нового интерфейсного сценария
- **THEN** он может соединить label, описание, error state и text control без локального palette CSS

#### Scenario: Control недоступен
- **WHEN** Button, IconButton или input получает `disabled` либо loading state
- **THEN** он не выполняет действие, сообщает состояние assistive technology и сохраняет читаемую
  семантику активной темы

### Requirement: Доступные overlays и выбор

Frontend SHALL предоставлять единые primitives для Dialog, Sheet, Popover, Select, Tabs и Tooltip
с предсказуемой keyboard-навигацией. Modal overlays MUST закрываться по Escape, возвращать focus
триггеру и иметь доступные title/description; Sheet MUST сохранять mobile-safe размеры и touch
targets.

#### Scenario: Пользователь закрывает overlay с клавиатуры
- **WHEN** пользователь открывает Dialog, Sheet или Popover и нажимает Escape
- **THEN** overlay закрывается, а keyboard focus возвращается к открывшему его control

#### Scenario: Пользователь выбирает option без мыши
- **WHEN** пользователь открывает Select или Tabs с клавиатуры
- **THEN** он может перейти к доступному option, увидеть выбранное состояние и подтвердить выбор без
  потери focus

### Requirement: Спокойные feedback states

Frontend SHALL предоставлять primitives для Skeleton, EmptyState, Alert и Toast, чтобы loading,
empty, informative, success, warning и error состояния отображались последовательно. Эти состояния
MUST быть русскоязычными там, где component содержит дефолтный текст, и не должны скрывать или
самостоятельно изменять пользовательские данные.

#### Scenario: Экран временно не содержит данных
- **WHEN** новый экран получает корректный пустой результат
- **THEN** он может показать спокойный EmptyState с понятным следующим шагом вместо пустой области

#### Scenario: Появляется несрочное системное сообщение
- **WHEN** интерфейс показывает Alert или Toast
- **THEN** сообщение имеет подходящую semantic роль, остаётся читаемым в обеих темах и не блокирует
  выполнение несвязанного действия

### Requirement: Постепенное внедрение без регрессии legacy UI

Новый primitive layer MUST быть обратно совместим с текущими Tailwind styles и существующими
Headless UI consumers. Он SHALL быть доступен для новых интерфейсных changes, но MUST NOT требовать
массовой миграции product routes, изменения навигации или замены работающих legacy overlays в рамках
этого change.

#### Scenario: Пользователь открывает существующий экран
- **WHEN** пользователь работает на page, ещё не выбранной новым feature change
- **THEN** её текущие data flow, navigation и interaction behavior сохраняются
