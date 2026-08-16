# Research: Personal Progress and Analytics

## Prepared avatars instead of uploads

**Decision**: Ship a fixed local avatar catalog and store a validated identifier.

**Rationale**: It delivers personalization without object storage, image moderation, upload security, cleanup jobs or a new paid dependency. It also keeps the profile response small and deterministic.

**Alternatives considered**: Direct database binary storage was rejected because it increases database traffic and backup size. External object storage was deferred until provider, limits, deletion and moderation rules are selected.

## Device-local onboarding

**Decision**: Persist the one-time task-creation popover state in the existing settings store on each device.

**Rationale**: The popover is presentation state, not user-owned business data. Local persistence avoids a server field and keeps it available on a genuinely new device where it may still be useful. Energy is already self-explanatory and Mind Hub already has contextual help, so extra panels would duplicate information.

**Alternatives considered**: A server-side onboarding table was rejected as unnecessary coupling. Persistent inline panels in Energy and Mind Hub were rejected because they take working space and repeat existing copy.

## Tone as a server-owned preference

**Decision**: Store `calm`, `moderate` or `strict` on the user and build the AI system instruction on the backend.

**Rationale**: The browser must not be able to remove safety constraints or control provider instructions. A server-owned preference also works across devices.

**Alternatives considered**: Sending free-form tone instructions from the client was rejected as unsafe. Keeping tone only in local storage was rejected because AI executes on the backend and the preference should follow the account.

## Local calendar dates for streaks

**Decision**: Store an explicit validated `YYYY-MM-DD` completion/check/protection date supplied by the active client, with server timestamps retained for audit.

**Rationale**: A UTC timestamp alone can shift a completion to a different day for the user. Glowy already uses a date-only task contract, so the same invariant is predictable and testable.

**Alternatives considered**: Adding a full user-timezone preference was deferred to localization/account work. Deriving all dates in UTC was rejected because it produces surprising streak boundaries.

## Separate habits and idempotent progress records

**Decision**: Keep habits separate from tasks, enforce unique daily habit checks, unique protected dates and unique achievement keys in the database.

**Rationale**: Habits and tasks have different lifecycle and recurrence semantics. Database uniqueness protects against repeated taps and concurrent requests more reliably than client state.

**Alternatives considered**: Encoding habits as repeating tasks was rejected because it would complicate task filters, completion, XP and analytics. Computing achievements without records was rejected because users need stable one-time awards.

## One additive migration

**Decision**: Extend User and Task and create Habit, HabitCheck, StreakRescue, Achievement and AiUsageDaily in one additive migration.

**Rationale**: All three releases are being implemented on one branch and later features depend on earlier data. Nullable/defaulted columns and new tables preserve old users and tasks.

**Alternatives considered**: Multiple migrations per version would improve release separation but increase production coordination while the versions are delivered together. JSON blobs on User were rejected because they weaken validation, indexes and idempotency.

## Server-owned analytics

**Decision**: Calculate week/month analytics on the backend from authenticated user data and return a typed aggregate snapshot.

**Rationale**: This prevents client drift, supports cross-device consistency and creates a safe aggregate payload for AI explanation without task text.

**Alternatives considered**: Continuing client-only analytics was rejected because it cannot be trusted for premium access or unit-economics decisions.

## Premium entitlement and weighted usage

**Decision**: Allow analytics AI insight for effective Focus and promotional Founder entitlements. Charge five daily usage units for a weekly analysis and ten for a monthly analysis after a successful provider response.

**Rationale**: Founder represents promised lifetime premium access. Two gates allow a fast global shutdown while respecting explicit user participation.

**Alternatives considered**: Client-only hiding was rejected because direct API calls would bypass it. Restricting Founder was rejected as inconsistent with the lifetime offer.

## Prompt-free daily AI cost aggregates

**Decision**: Upsert one daily aggregate per user, plan, provider and model. Store request count, tokenized/priced request counts, token totals and configured estimated micro-USD cost.

**Rationale**: Daily aggregation bounds row growth, supports unit economics by plan and explicitly distinguishes missing usage/rates from zero cost. No user text is retained.

**Alternatives considered**: One row per request was rejected as unnecessary volume. Logs alone were rejected because they are difficult to query reliably across deploys. Treating missing rates as zero was rejected because it would understate cost.

## v2.6.0 exclusion

**Decision**: Do not modify registration, email confirmation, password reset, OAuth routes, auth schema or auth UI.

**Rationale**: The owner explicitly removed v2.6.0 from this implementation batch. It remains a later roadmap release with external-provider and migration coordination.
