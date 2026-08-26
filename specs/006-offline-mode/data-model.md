# Data Model

## OfflineSnapshot

- `ownerKey`: `user:<id>`
- `tasks`: полный локальный массив задач с подзадачами
- `updatedAt`: ISO timestamp

## OfflineOperation

- `id`: UUID
- `ownerKey`: владелец очереди
- `entity`: `task | subtask`
- `action`: `create | update | delete`
- `entityId`: серверный или отрицательный временный ID
- `parentTaskId`: для подзадачи
- `payload`: данные существующего API
- `createdAt`, `attempts`, `lastError`

## OfflineSyncState

- `status`: `online | offline | pending | syncing | attention`
- `pendingCount`: число ожидающих операций
- `lastSyncedAt`: время успешной сверки
- `message`: безопасное описание проблемы

## Invariants

- Запись без `ownerKey` запрещена.
- Очередь одного owner воспроизводится строго последовательно.
- Временный ID заменяется во снимке и оставшихся операциях атомарно.
- Выход очищает память, но не снимок владельца; другой owner его не видит.
