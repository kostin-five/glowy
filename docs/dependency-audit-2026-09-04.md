# Dependency audit — 2026-09-04

## Проверка

Выполнена команда `npm audit --omit=dev --json` после добавления OpenSpec 1.12.0. Npm сообщил о
10 package findings: 8 high, 1 moderate и 1 low, без critical.

Затронуты прямые или попавшие в проверяемое дерево пакеты:

- прямые: `axios`, `react-router-dom`, `vite`;
- транзитивные: `body-parser`, `form-data`, `ip-address`, `nanoid`, `postcss`, `qs` и
  `react-router`.

Миграция OpenSpec не меняет существующие lockfile entries этих пакетов: её diff добавляет
dev-only дерево `@fission-ai/openspec`. Findings относятся к уже закреплённым версиям основного
проекта и требуют отдельного dependency-upgrade change с проверкой auth, routing, offline/API,
build и backend HTTP flows.

## Решение

Автоматический `npm audit fix` намеренно не выполнялся: он создал бы несвязанный dependency churn
и мог изменить runtime без review. До production-релиза следует создать отдельный OpenSpec change,
обновить прямые зависимости совместимыми версиями, пересобрать lockfile и повторить полный gate.
Этот audit — снимок на указанную дату; перед upgrade или release его нужно выполнить заново.
