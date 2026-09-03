# Research

- Decision: keyed view by account/guest + period + date. Evidence: existing snapshot effect lacks
  owner identity; retry has no cleanup; failed period changes retain the old snapshot.
  Alternative: separately tagged fields require more bookkeeping and leave stale modal risk.
- Decision: lifetime guard for retry, AI and clipboard callbacks; retain initial-effect cleanup.
  Keyed unmount alone does not stop localStorage writes. AbortController cannot promise a refund.
- Decision: disable deletion during regeneration, keep copy/old report. Prevents report resurrection.
- Existing API schemas, storage and costs remain. No new technologies or open research questions.
