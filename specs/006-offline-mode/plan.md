# Implementation Plan: Offline-режим задач

**Branch**: `codex/v2.6.0-offline-mode` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

## Summary

Добавить local-first работу с задачами и подзадачами для ранее авторизованного пользователя. Последний серверный снимок и последовательная очередь изменений хранятся в IndexedDB отдельно по `user.id`; существующие `TaskApi` и `SubTaskApi` используются для синхронизации после возвращения сети. Приложение сохраняет локальную сессию при сетевой ошибке `/auth/me`, показывает статус синхронизации и не пытается выполнять AI, оплату или новый вход офлайн.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, JavaScript ESM / Node.js 22  
**Primary Dependencies**: Zustand, Axios, React Router, Vite, vite-plugin-pwa, Zod  
**Storage**: IndexedDB в браузере; существующая PostgreSQL через Prisma без изменения схемы  
**Testing**: Vitest, Node test runner, Playwright  
**Target Platform**: Современные desktop/mobile браузеры и установленное PWA  
**Project Type**: React SPA + Express API  
**Performance Goals**: локальный снимок отображается до 2 секунд; синхронизация начинается до 3 секунд после восстановления сети  
**Constraints**: без Prisma migration; без второго API; без хранения секретов и AI-текста; данные строго разделены по пользователю  
**Scale/Scope**: задачи и подзадачи одного аккаунта на устройстве, очередь до сотен локальных действий

## Constitution Check

- **Пользовательский контроль**: PASS. Offline-действия отражают только явные действия пользователя; AI не меняет данные.
- **Существующая архитектура**: PASS. Переиспользуются текущие stores и API; IndexedDB является клиентским слоем устойчивости, а не параллельным backend.
- **Данные и секреты**: PASS. Хранятся только задачи, подзадачи и техническая очередь.
- **Миграции**: PASS. Изменение Prisma schema не требуется.
- **Проверки**: PASS. План включает unit- и Playwright-сценарии offline/reconnect/account isolation.

## Project Structure

```text
src/offline/
  taskOfflineDb.ts       IndexedDB snapshots and operations
  taskOfflineQueue.ts    queue compaction and temporary IDs
  taskOfflineSync.ts     replay, locking and tab coordination
src/components/
  OfflineSyncStatus.tsx  unobtrusive status and retry action
src/store/
  useAuthStore.ts        stable user id and offline session behavior
  useTaskStore.ts        local-first task mutations
src/App.tsx              offline initialization and reconnect handling
src/layouts/AppLayout.tsx status placement
backend/routes/auth.routes.js stable user id in auth responses
e2e/offline.spec.ts      offline, reload, reconnect and isolation scenarios
```

## Design

1. Авторизация хранит `user.id`. Сетевая ошибка `/auth/me` не уничтожает уже сохранённую локальную сессию, а `401/403` по-прежнему выполняют выход.
2. IndexedDB `glowy-offline` содержит снимок задач и очередь операций, ключи всегда включают владельца `user:<id>`.
3. Новые локальные сущности получают отрицательные числовые ID. После успешного POST временный ID заменяется серверным во снимке и следующих операциях.
4. Очередь использует команды create/update/delete для задач и подзадач. Последовательные изменения одной сущности уплотняются, не меняя итог пользователя.
5. Replay выполняется строго по порядку. Web Locks не допускает двух обработчиков, BroadcastChannel обновляет другие вкладки.
6. Сетевые ошибки и 5xx остаются в очереди; 4xx переводят синхронизацию в состояние «Нужно внимание» с ручным повтором.
7. После replay приложение перечитывает серверный снимок. Для MVP сервер побеждает при конфликте с изменением на другом устройстве.
8. Глобальная плашка различает «Нет сети», «Сохранено на устройстве», «Синхронизация» и «Нужно внимание».
9. AI, оплата и новая авторизация офлайн не запускаются и показывают понятное сообщение. Гостевой режим не меняется.

## Verification Strategy

- Unit: уплотнение очереди, remap временных ID, классификация retryable/blocked ошибок.
- Integration: локальные CRUD-операции сохраняются после reload и отправляются в правильном порядке.
- E2E: online -> offline -> edit -> reload -> reconnect и account isolation.
- Regression: typecheck, lint, frontend/backend tests, production build и Playwright.

## Risks and Mitigations

- **Повтор команды после обрыва ответа**: клиентская идемпотентность в пределах текущего API; server idempotency keys вне MVP.
- **Конфликт вкладок**: Web Locks и BroadcastChannel.
- **Утечка между аккаунтами**: owner key обязателен, store очищается до hydrate другого owner.
- **Рост очереди**: операции уплотняются, успешные удаляются сразу.

## Complexity Tracking

Папка `src/offline` изолирует браузерное хранение и replay от UI и текущих API. Нового backend flow и новой базы не создаётся.
