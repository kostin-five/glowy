# Публичная версия: согласованный manifest

Не содержит значений секретов или персональных реквизитов. Изменение текущих файлов
не удаляет информацию из старых коммитов. Очищена только изолированная локальная
Git-копия; история основного checkout и GitHub не переписана.

## Оставить публичными

- `src/`, `backend/`, `packages/contracts/`, `ai-proxy/`: исходники и синтетические тесты.
- `backend/prisma/`: schema и миграции, без выгрузок базы.
- `.env.example`, `backend/.env.example`, `ai-proxy/.env.example`: только placeholders.
- `docs/architecture.md`, `docs/design-system.md`, `docs/dependency-audit-2026-09-04.md`.
- `openspec/specs/` и активные change-артефакты после повторной проверки.
- `LICENSE`: действующая All Rights Reserved; публикация не равна open-source лицензии.

## Обезличено / обновлено в текущей версии

- `src/pages/PrivacyPolicyPage.tsx`, `OfferPage.tsx`, `TermsOfServicePage.tsx`,
  `RefundPolicyPage.tsx`, `RequisitesPage.tsx`, `ContactsPage.tsx`, `PersonalDataConsentPage.tsx`:
  убрать личные реквизиты; заменить коммерческие обещания честным описанием demo.
- `README.md`, `docs/README.md`, `docs/release-checklist.md`, `deploy/README.md`:
  убрать production-пути, инструкции с живой базой и устаревшие deployment claims.
- `docs/product-roadmap.md`: заменены устаревшие ссылки на закрытые handoff.
- `docs/marketing-plan.md`, `docs/ai-unit-economics.md`, `docs/releases/*`:
  проверены на личные реквизиты; исторические планы не объявляются результатами продукта.
- `AGENTS.md`: после переноса handoff заменить ссылки на публичные руководства.

## Исключено из текущей версии после согласования

- `docs/handoffs/DEVELOPER_ONBOARDING.md`
- `docs/handoffs/NEXT_CHAT_PROMPT.md`
- `docs/handoffs/PROJECT_HANDOFF_2026-08-10.md`
- `docs/handoffs/PROJECT_HANDOFF_2026-08-30.md`
- `docs/handoffs/PROJECT_HANDOFF_2026-09-01.md`
- `docs/handoffs/PROJECT_HANDOFF_2026-09-04.md`
- `docs/handoffs/PROJECT_HANDOFF_2026-09-09.md`
- `docs/README_KODIK_REVIEW.md`
- `docs/payments-live-checklist.md`
- `docs/telegram-bot-operations.md` (заменить нейтральной integration-документацией).

Приватная копия документации уже сохранена вне репозитория. Это копия документов,
**не backup PostgreSQL и не резервная копия всей Git-истории**.

## Отдельное решение по истории

Исторические legal pages содержат персональные реквизиты, commit metadata — авторские
email. Исторические `.specify/` и `specs/` не редактировать попутно. До Make public
нужны review полной истории, резервная копия Git и отдельное согласование удаления
конкретных путей/значений. Не выполнять force push автоматически.

## Внешние материалы

Исторический `docs/handoffs/NEXT_CHAT_PROMPT_V2.9.0.md` дополнительно исключён
из локальной публикационной Git-копии после отдельного согласия владельца.
Итого из истории исключены одиннадцать документов; исходная и удалённая история
не изменены. Незакоммиченные исправления требуют отдельного переноса в эту копию.

Отдельно проверить GitHub Actions artifacts/logs, PR, issues, releases, attachments и
статические deployments: очистка Git не удаляет эти данные.
