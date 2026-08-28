# Contract: сохранённый аналитический отчёт

Storage key MUST включать authenticated user id и точные границы периода. Чужой owner/period MUST NOT возвращаться экрану.

```text
StoredAnalyticsReportV1 = {
  version: 1,
  ownerId: positive integer,
  period: "week" | "month",
  from: YYYY-MM-DD,
  to: YYYY-MM-DD,
  text: non-empty string,
  createdAt: ISO timestamp
}
```

Malformed/unknown-version/empty/mismatched records игнорируются без crash. Save выполняется только после успешного Analytics API response. Failed regeneration не удаляет предыдущую запись.

Render поддерживает plain paragraphs, `#`–`###` headings, unordered/numbered lists и `**bold**`. Raw HTML никогда не исполняется. Copy пишет original readable text и показывает русский success/error status.

