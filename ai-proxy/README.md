# Glowy AI Proxy (rollback only)

This private service is a rollback-only component retained after direct backend calls to DeepSeek
and GigaChat passed local gates. It is not the normal Glowy AI runtime. Before any removal or
production change, verify the deployed provider mode and obtain owner approval. It forwards
provider-neutral chat messages to DeepSeek. The frontend must never call it directly.

## Environment

```env
PORT=3002
AI_PROXY_SECRET=
AI_PROVIDER_TIMEOUT_MS=30000
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

## Run and health check

```bash
npm install
npm start
curl http://localhost:3002/health
```

The main backend uses this rollback only with `AI_PROVIDER_MODE=proxy`, `AI_PROXY_URL`, and the
same server-only `AI_PROXY_SECRET`. Removing the proxy process, infrastructure secrets or this
directory is a separate approved cleanup, not a side effect of ordinary feature work.
