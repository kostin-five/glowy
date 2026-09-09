# Implementation Plan: Персонализация фона

**Branch**: `codex/background-personalization` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Расширить существующий settings store строгим идентификатором фона, добавить небольшой IndexedDB adapter для единственного пользовательского Blob, применить фон в `AppLayout` через отдельный hook и добавить responsive picker в текущий раздел «Интерфейс».

## Technical Context

**Language/Version**: TypeScript 6, React 19, ESM
**Primary Dependencies**: Zustand persist, native IndexedDB, Testing Library, Vitest
**Storage**: localStorage только для wallpaper id; IndexedDB для одного Blob
**Testing**: store normalization, storage adapter, settings picker, focused typecheck
**Constraints**: local-only, Russian UI, no network/schema/env/production/LandingPage, preserve logo/orb

## Constitution Check

- **I. Контроль**: pass — файл применяется только после явного выбора; доступен явный сброс.
- **II. Архитектура**: pass — используется существующий settings store и единственная app shell, параллельный профиль не создаётся.
- **III. Данные**: pass — изображение не покидает устройство, формат/размер проверяются, ошибка безопасна.
- **IV. Проверки**: pass — pure/storage/component tests и typecheck включены; полный gate отложен по прямому решению пользователя.
- **V. Совместная разработка**: pass — отдельная ветка, локальный rollback, документация обновляется.

## Project Structure

```text
src/store/useSettingsStore.ts
src/personalization/wallpapers.ts
src/personalization/customWallpaperStorage.ts
src/personalization/useAppWallpaper.ts
src/components/settings/WallpaperPicker.tsx
src/layout/AppLayout.tsx
src/pages/SettingsPage.tsx
src/**/*.test.ts(x)
docs/product-roadmap.md
docs/architecture.md
docs/handoffs/PROJECT_HANDOFF_2026-09-04.md
```

## Design and Rollback

Встроенные варианты описываются данными и CSS gradients. Hook получает выбранный id, асинхронно читает custom Blob только для `custom`, создаёт object URL и возвращает безопасный fallback при ошибке. `AppLayout` рисует фон отдельным декоративным слоем и поверх него неизменяемый затемняющий слой. Rollback — revert одного feature commit; удаление custom Blob не влияет на задачи, аккаунт или сервер.
