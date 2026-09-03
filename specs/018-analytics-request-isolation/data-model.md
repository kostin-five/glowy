# Data model

No persistent/API entities change.
View scope: ownerId (number/null), guest, week/month, local anchor YYYY-MM-DD and mounted lifetime.
Owns snapshot, error, report override, copy feedback and modal.
Snapshot: pending → success/error → explicit retry pending.
Insight: idle → explicit pending → success/error; immediate ref lock prevents duplicates.
Unmount makes late completions inert, including storage writes; next scope is independent.
Callback validity also checks current auth owner/guest to guard the interval before cleanup.
Saved report retains existing owner + period + from/to identity. Restore works as before;
failed regeneration preserves old report; deletion is disabled during pending only.
