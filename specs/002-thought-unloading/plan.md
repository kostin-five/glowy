# Implementation Plan: Разгрузка мыслей

**Branch**: `feature/local-development` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-thought-unloading/spec.md`

## Summary

Переименовать текущий «Хаб мыслей» в «Разгрузку мыслей» и разорвать связь между AI-анализом и
немедленной записью данных. Существующий AI endpoint продолжит учитывать авторизацию, тарифные
лимиты, энергию и активные задачи, но будет возвращать только разговорный ответ и нормализованные
черновики. Frontend покажет редактируемую карточку каждого черновика и создаст задачу через
существующий Task API только после явного подтверждения. Схема PostgreSQL не меняется.

## Technical Context

**Language/Version**: TypeScript 6 / React 19 на frontend; ESM JavaScript / Node.js 22+ на backend

**Primary Dependencies**: Vite, Zustand, Axios, Zod, Express, Prisma, существующий server-side
AI provider/proxy

**Storage**: Существующая PostgreSQL через `backend/lib/prisma.js`; черновики хранятся только в
состоянии текущего frontend-сеанса до подтверждения

**Testing**: Vitest + Testing Library для frontend; `node:test` + Supertest для backend;
Playwright для ручного/браузерного smoke на мобильных ширинах

**Target Platform**: Современные desktop/mobile web-браузеры; Express backend на существующей
Linux-инфраструктуре

**Project Type**: Web application с отдельными frontend, backend и optional AI proxy

**Performance Goals**: Не добавлять второй AI-запрос к одному сообщению; карточка черновика
появляется в том же ответе, что и текст AI; UI остаётся отзывчивым при 1–5 черновиках и до 10
шагов в каждом

**Constraints**: Никаких автоматических изменений задач; пользовательский текст на русском;
никаких текстов сообщений/черновиков в логах и аналитике; лимиты только на backend; без изменения
`src/pages/LandingPage.tsx`, production env, deploy или базы

**Scale/Scope**: Текущий dashboard Mind Hub, два AI endpoint (`public` и authenticated), текущий
Task API/store и связанные unit/HTTP проверки; отдельная страница Glowy AI, voice и persistent
server history вне scope

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Пользовательская ценность и контроль — PASS**: AI endpoint больше не создаёт и не меняет
  данные; отдельная кнопка подтверждения является единственной точкой записи.
- **Развитие существующей архитектуры — PASS**: переиспользуются текущие AI route/service,
  `AiApi`, Zustand task store и `POST /api/tasks`; параллельных подсистем нет.
- **Защита данных, денег и секретов — PASS**: AI-лимиты остаются серверными, provider keys не
  покидают proxy/backend, логи и аналитика не получают тексты.
- **Доказательства перед релизом — PASS**: предусмотрены parser/contract tests, component tests,
  typecheck, lint, unit, backend HTTP tests, build и ручные desktop/mobile сценарии.
- **Понятная совместная разработка — PASS**: русские пользовательские строки, явный контракт
  ответа и обновление архитектурной документации.
- **Database/production gate — PASS**: схема и migrations не меняются; production operations не
  выполняются.

## Project Structure

### Documentation (this feature)

```text
specs/002-thought-unloading/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mind-hub-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── AiApi.ts
│   └── AiApi.analytics.test.ts
├── components/mind/
│   ├── MindHubChat.tsx
│   ├── MindHubDraftCard.tsx
│   └── MindHubDraftCard.test.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── PricingPage.tsx
│   └── PrivacyPolicyPage.tsx
├── store/
│   └── useTaskStore.ts
├── types/
│   └── index.ts
└── utils/
    ├── analytics.ts
    └── analytics.test.ts

backend/
├── routes/
│   └── ai.routes.js
├── services/ai/
│   ├── mind-hub-parser.service.js
│   ├── mind-hub-parser.service.test.js
│   └── mind-hub.service.js
└── test/
    └── app.test.js

docs/
└── architecture.md
```

**Structure Decision**: Сохранить текущую web-архитектуру. Новая UI-карточка изолирует
редактирование черновика, но получение AI-ответа остаётся в `MindHubChat`, а запись — в
существующем `useTaskStore.createTask`. Backend route отвечает только за orchestration AI,
контекст, лимиты и безопасную выдачу черновиков.

## Complexity Tracking

Нарушений конституции, требующих оправдания, нет.

## Design Decisions

1. Endpoint сохраняет существующие URL `/api/ai/mind-hub` и `/api/ai/mind-hub/public`, но
   возвращает `drafts` вместо созданных `tasks`.
2. Backend никогда не вызывает create/update Prisma внутри Mind Hub flow. Активные задачи
   читаются только для контекста и предупреждения о дублях.
3. Каждый черновик редактируется и подтверждается независимо. Подтверждение блокируется на время
   запроса, что защищает от двойного клика.
4. Подтверждение вызывает существующий `useTaskStore.createTask`, который сохраняет основную
   задачу и подзадачи одним существующим Task API запросом.
5. Ответ AI сохраняется и показывается даже при наличии черновика. Повреждённый AI payload не
   превращается эвристически в задачу.
6. Запрос на изменение существующей задачи получает объяснение без mutation; автоматическое
   изменение даты из старого Mind Hub flow удаляется.
7. Событие `ai_draft_confirmed` фиксирует только факт успешного подтверждения после согласия на
   аналитику и не содержит текстовых полей.

