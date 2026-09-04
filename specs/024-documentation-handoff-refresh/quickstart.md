# Quickstart: Verify the documentation refresh

```bash
git status --short --branch
rg -n "Express ESM JavaScript|Backend remains ESM JavaScript|Следующий релиз: v2.9.0|git pull origin dev" \
  AGENTS.md README.md docs deploy backend ai-proxy
git diff --check
git diff --name-only
```

Expected: stale wording appears only in clearly archived historical context, diff contains Markdown,
the Spec Kit feature pointer and this specification directory, and no secrets/application code.
