# Glowy backend

Backend написан на TypeScript, компилируется в игнорируемый каталог `backend/dist/` и запускается
обычным Node.js без runtime-loader.

Единственный Prisma client source — `backend/lib/prisma.ts`. Суффикс `.js` в NodeNext imports
указывает на путь emitted artifact и не означает наличие второго JavaScript source.

## Локальная работа

```bash
npm install
npm run typecheck
npm run build
npm test
```

`npm run serve` следит за `.ts`/`.json`, пересобирает backend и запускает
`dist/server.js`. Для однократного запуска сначала выполни `npm run build`, затем `npm start`.
Команда `npm run start:compiled` объединяет эти два шага.

## Production artifact

Production artifact создаётся командой `npm run build`; PM2 должен запускать только
`backend/dist/server.js`. Переключение production допускается отдельно после backup/checklist и
явного разрешения владельца. Сборка не подключается к базе и не запускает Prisma migration.

## Code-only rollback

Миграция не меняет схему или данные. До production достаточно вернуть предыдущий кодовый commit,
удалить только локальный `backend/dist/` через штатную следующую сборку и повторить `npm run build`.
После отдельно разрешённого production-релиза rollback означает восстановить предыдущий artifact
и прежний PM2 entrypoint; откат базы не требуется.
