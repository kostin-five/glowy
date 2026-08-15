# Glowy AI Proxy (temporary rollback)

This private service is retained only until direct backend calls to DeepSeek and GigaChat pass dev
and Timeweb smoke tests. It forwards provider-neutral chat messages to DeepSeek. The frontend must
never call it directly.

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
same server-only `AI_PROXY_SECRET`. After direct providers are verified in both environments,
remove the proxy process, its infrastructure secrets, and this directory in a separate cleanup.
