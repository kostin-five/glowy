# Glowy AI Proxy

Small private server that receives AI requests from the main Glowy backend, calls DeepSeek, and
returns plain text responses.

The frontend must never call this service directly. Keep `AI_PROXY_SECRET` only on servers.

## Environment

Create `.env` from `.env.example`:

```env
PORT=3002
AI_PROVIDER=deepseek
AI_PROXY_SECRET=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
```

Keep the DeepSeek key and `AI_PROXY_SECRET` only in server `.env` files.

## Local Run

```bash
npm install
npm run start
```

## Production With PM2

```bash
npm install --omit=dev
pm2 start ecosystem.config.cjs
pm2 save
```

## Health Check

```bash
curl https://YOUR_PROXY_DOMAIN/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "glowy-ai-proxy"
}
```

## Proxy Request Example

```bash
curl -X POST https://YOUR_PROXY_DOMAIN/v1/gemini \
  -H "Authorization: Bearer YOUR_AI_PROXY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "generateContent",
    "prompt": "Ответь коротко: привет",
    "contextLabel": "Manual test"
  }'
```

Successful response:

```json
{
  "ok": true,
  "text": "Привет!",
  "modelUsed": "gemini-2.5-flash"
}
```

## Notes

- Do not expose this proxy to frontend code.
- Do not store `AI_PROXY_SECRET` in Vite env variables.
- Production logs intentionally avoid full prompts, messages, and history.
- The main backend should call this service with `Authorization: Bearer <AI_PROXY_SECRET>`.
