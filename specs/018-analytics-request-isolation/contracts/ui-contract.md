# UI and API contract

Existing AnalyticsApi GET snapshot(period, anchor) and POST insight(period, anchor) unchanged.
Backend auth, Zod responses, allowances, costs 5/10 and storage keys remain authoritative.
No logs/events/AI requests are added automatically.
Scope change resets the view before data is displayed. Loading uses existing live status;
failure has «Повторить» and no old cards; guests see login invitation and send no requests.
AI pending shows «Готовлю глубокий разбор…» role=status, with notice that leaving does not cancel
the server request. Delete/regenerate disabled, old report readable and copyable.
One pending AI call per view; existing regeneration confirmation preserved.
Leaving discards its response/error and storage write, not its server work/cost.
Test only synthetic accounts/reports; verify widths 320/360/390/430 and desktop.
