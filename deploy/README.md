# Glowy Backend VPS Deploy

Инструкция для production-деплоя backend Glowy на Ubuntu VPS через PM2 и Nginx.

## 1. Обновить систему

```bash
sudo apt update
sudo apt upgrade -y
```

## 2. Установить Node.js LTS

Пример для Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 3. Установить PM2

```bash
sudo npm install -g pm2
pm2 -v
```

## 4. Установить Nginx и Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 5. Клонировать проект

```bash
cd /var/www
sudo git clone <REPOSITORY_URL> glowy
sudo chown -R $USER:$USER /var/www/glowy
cd /var/www/glowy/backend
```

## 6. Установить backend dependencies

```bash
npm install
```

## 7. Создать backend/.env

Скопировать пример:

```bash
cp .env.example .env
nano .env
```

Заполнить реальные значения:

```env
PORT=3001
DATABASE_URL=
JWT_SECRET=
AI_PROVIDER_MODE=direct
AI_PROVIDER_TIMEOUT_MS=30000
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_BASE_URL=https://api.giga.chat
AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD=
AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_INPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_OUTPUT_PER_MILLION_USD=
PAID_FOREVER_ENABLED=false
FOREVER_PRICE_RUB=
CORS_ORIGINS=https://glowy-ai.ru,https://www.glowy-ai.ru,https://dev.glowy-ai.ru,http://localhost:5173,http://localhost:4173
```

Не хранить секреты в git.

Глубокий анализ аналитики доступен только активным Focus/Founder-пользователям
и запускается ими вручную. Стоимости за миллион токенов задаются по актуальным
тарифам провайдеров; пустое значение
означает, что стоимость запроса остаётся неизвестной, а не равной нулю.

## 8. Подготовить Prisma для первого запуска

### Вариант A: безопасный первый запуск с существующей production-базой

Текущая production-база Glowy на Timeweb PostgreSQL уже содержит таблицы и
используется работающим приложением. Для первого переноса backend на VPS в этом
случае достаточно сгенерировать Prisma Client:

```bash
npx prisma generate
```

Не выполняй `npm run migrate:deploy`, если база уже содержит актуальные таблицы
и приложение сейчас работает. На текущей Timeweb PostgreSQL эта команда может
вернуть `P3005`, потому что база не пустая и не baseline-нута для Prisma
migrations.

После `npx prisma generate` можно запускать backend и проверять:

- `GET /api/health`;
- регистрацию и вход;
- загрузку и создание задач;
- работу подзадач и Хаба мыслей.

### Вариант B: новая пустая база или уже baseline-нутая база

`npm run migrate:deploy` безопасен только для пустой новой базы или базы, где
уже корректно ведется таблица `_prisma_migrations`.

```bash
npm run migrate:deploy
```

### Prisma baseline

Ошибку `P3005` нельзя решать через `prisma migrate reset` на production: эта
команда может удалить данные.

Если нужно привести существующую Timeweb-базу к нормальному состоянию Prisma
migrations, это нужно делать отдельной задачей:

1. Сверить `backend/prisma/schema.prisma` с реальными таблицами production-базы.
2. Сверить папку `backend/prisma/migrations` с тем, какие изменения уже
   фактически применены в базе.
3. Проверить наличие и содержимое таблицы `_prisma_migrations`.
4. Только после ручной проверки можно использовать
   `prisma migrate resolve --applied` для тех миграций, которые уже реально
   применены в базе.

Не запускай `prisma migrate resolve --applied` без точного списка миграций и
подтверждения, что структура базы соответствует этим миграциям.

## 9. Запустить backend через PM2

Начиная с v2.10.0 перед переключением PM2 требуется собрать TypeScript artifact. Это изменение
production entrypoint выполняется только после отдельного разрешения владельца и успешного
release checklist; сама инструкция ничего не переключает.

```bash
cd /var/www/glowy/backend
npm run typecheck
npm run build
test -f dist/server.js
```

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs glowy-backend
```

Сохранить процесс и включить автозапуск:

```bash
pm2 save
pm2 startup
```

PM2 выведет команду с `sudo env ...`; её нужно скопировать и выполнить.

Для code-only rollback восстановить предыдущий commit/artifact и прежний PM2 entrypoint, затем
перезапустить процесс. Миграция v2.10.0 не требует отката PostgreSQL.

## 10. Настроить Nginx

Скопировать пример конфига:

```bash
sudo cp /var/www/glowy/deploy/nginx/glowy-api.conf.example /etc/nginx/sites-available/glowy-api.conf
sudo ln -s /etc/nginx/sites-available/glowy-api.conf /etc/nginx/sites-enabled/glowy-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 11. Выпустить SSL

Убедиться, что DNS `api.glowy-ai.ru` указывает на VPS.

```bash
sudo certbot --nginx -d api.glowy-ai.ru
sudo nginx -t
sudo systemctl reload nginx
```

## 12. Проверить backend

```bash
curl https://api.glowy-ai.ru/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","service":"glowy-backend"}
```

## 13. После миграции frontend

В production frontend нужно указать:

```env
VITE_API_URL=https://api.glowy-ai.ru/api
```

После этого пересобрать и задеплоить frontend.
