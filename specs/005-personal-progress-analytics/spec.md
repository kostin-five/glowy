# Feature Specification: Personal Progress and Analytics

**Feature Branch**: `codex/versions-2.3.0-2.5.0`

**Created**: 2026-08-16

**Status**: Approved for implementation; migration application remains operator-only

**Input**: Implement roadmap releases v2.3.0-v2.5.0 in order: profile personalization, calm onboarding and configurable Glowy tone; a unified personal-progress area with streaks, habits, achievements and optional task time; useful week/month analytics, premium AI explanations and measured AI cost. Release v2.6.0 and all email/OAuth work are explicitly outside this feature.

## User Scenarios & Testing

### User Story 1 - Personal Glowy profile (Priority: P1)

An authenticated user chooses a prepared avatar and one of three communication styles for Glowy. The selected identity and tone remain consistent after a reload and on another device.

**Why this priority**: Personalization is the smallest independent release and establishes the preference used by later AI experiences.

**Independent Test**: Change the avatar and tone in settings, reload and sign in on another browser, then send an AI message and verify the new respectful tone without any change to tasks, limits or plan.

**Acceptance Scenarios**:

1. **Given** a user has no custom avatar, **When** they select an avatar from the prepared catalog, **Then** the profile stores its identifier and displays the same avatar throughout the application.
2. **Given** a user selects Calm, Moderate or Strict, **When** they send a new AI request, **Then** Glowy applies the selected style while preserving the same data access and AI allowance.
3. **Given** Strict is selected, **When** Glowy responds to a missed task or low-energy message, **Then** the response may be direct and demanding but contains no shame, insults, threats or manipulation.

---

### User Story 2 - Contextual first-use guidance (Priority: P1)

A new user sees one short, dismissible popover when they first open task creation. Energy remains self-explanatory and Mind Hub keeps its existing help without duplicate onboarding panels.

**Why this priority**: The product is easier to understand without a blocking tutorial or a redesign of the landing page.

**Independent Test**: Open task creation with fresh local settings, close the popover, navigate away and return; the form remains usable and the popover does not reappear.

**Acceptance Scenarios**:

1. **Given** a user has not seen task-creation guidance, **When** they open the create form, **Then** one compact popover appears beside the title field without covering the primary action.
2. **Given** the popover has appeared, **When** the user revisits task creation, **Then** it remains hidden on that device unless guidance is reset in Settings.

---

### User Story 3 - Calm personal progress (Priority: P2)

An authenticated user opens My Progress and can review XP and level, a clearly defined task-completion streak, available rescue circles, simple habits and earned achievements without being pressured to maintain them.

**Why this priority**: Progress should reward useful repetition while keeping Glowy's non-punitive product promise.

**Independent Test**: Complete tasks on test dates, create and check a habit, earn each initial achievement and explicitly use a rescue circle; verify stable cross-device state and no duplicate rewards.

**Acceptance Scenarios**:

1. **Given** completed tasks on consecutive local calendar days, **When** My Progress opens, **Then** the displayed streak and last active date match those completion dates.
2. **Given** one missed day and an available rescue circle, **When** the user confirms protection for that date, **Then** exactly one of the monthly three circles is consumed and the streak remains intact.
3. **Given** a user creates a habit, **When** they check today, **Then** the habit streak updates independently from normal tasks and the same day cannot be checked twice.
4. **Given** the user reaches an achievement threshold concurrently from two requests, **When** progress is recalculated, **Then** the achievement is awarded once.

---

### User Story 4 - Optional task time (Priority: P2)

A user may estimate a task in minutes and, after completion, record actual time or skip the prompt. Old tasks and users who do not track time continue to work unchanged.

**Why this priority**: Time data creates useful analytics only when it stays optional and low-friction.

**Independent Test**: Create tasks with and without an estimate, complete them, save or skip actual time, undo completion and verify the stored values and UI states.

**Acceptance Scenarios**:

1. **Given** a task form, **When** the user leaves estimated time empty, **Then** the task saves normally.
2. **Given** a task is newly completed, **When** the completion succeeds, **Then** the user can enter actual minutes or dismiss the prompt without losing completion.
3. **Given** an existing task from before this release, **When** it is viewed or edited, **Then** missing time fields do not produce zero-value claims or errors.

---

### User Story 5 - Useful analytics and premium insight (Priority: P3)

An authenticated user reviews a week or month summary of completed tasks, energy distribution, streaks and planned-versus-actual time. A premium user can explicitly request a deep AI analysis based only on aggregates; a Start user cannot bypass access through the API.

**Why this priority**: Analytics depends on reliable progress and time data and should provide Focus value rather than decorative charts.

**Independent Test**: Seed known tasks and time values, compare every aggregate for week and month, test empty data, then request AI insight as Start, Focus and Founder users.

**Acceptance Scenarios**:

1. **Given** known task activity in a selected period, **When** analytics loads, **Then** totals and distributions match the source data exactly.
2. **Given** no activity in a period, **When** analytics loads, **Then** it presents a useful empty state instead of empty charts or invented conclusions.
3. **Given** an eligible premium user, **When** they request an analysis, **Then** the server sends only aggregate values to AI, displays the 5-unit weekly or 10-unit monthly cost before launch and returns advisory text without mutating tasks.
4. **Given** a Start user, **When** they call the premium insight endpoint directly, **Then** the server rejects access without consuming an AI request.
5. **Given** an authenticated AI request succeeds, **When** provider usage is recorded, **Then** the backend aggregates request count, tokens and configured estimated cost by day, plan, provider and model without storing prompts.

---

### User Story 6 - Polished daily progress experience (Priority: P1)

An authenticated user receives immediate feedback while data loads or actions save, can manage active and archived habits across a five-day strip, inspect achievement progress, and configure the product from clearly separated settings sections.

**Why this priority**: The first implementation exposed correct data but several transient and management states were confusing or slow, so this refinement is required before release handoff.

**Independent Test**: Complete a task, record actual time, edit/archive/restore/delete a habit, inspect streak days and achievement details, collapse desktop navigation and reload each settings section without observing disappearing dialogs, blank placeholders or stale data.

**Acceptance Scenarios**:

1. **Given** analytics or progress is loading, **When** the request is pending, **Then** a stable branded loading state explains what is being prepared without a blank or flashing rectangle.
2. **Given** an active task disappears from the current filter after completion, **When** the completion succeeds, **Then** the actual-time prompt remains mounted until the user saves or dismisses it.
3. **Given** a habit exists, **When** the user views it, **Then** the UI shows the day before yesterday, yesterday, today and the next two days, while future days remain non-interactive.
4. **Given** a habit is archived, **When** the archive section opens, **Then** the habit can be restored or permanently deleted.
5. **Given** an achievement has not been earned, **When** its card is opened, **Then** the user sees its meaning, encouragement and measurable progress toward its target.
6. **Given** a desktop user collapses navigation, **When** they move between routes or reload, **Then** content expands and the navigation can be restored from a familiar icon control.

### Edge Cases

- A stored avatar identifier no longer exists in the prepared catalog.
- The AI tone value is absent or invalid for an older account.
- The user crosses a month boundary after using rescue circles.
- A device reports a malformed or future completion date.
- A task completion is quickly undone and repeated.
- A habit is archived after being checked today.
- Existing completed tasks have no dedicated completion date.
- Estimated time exists but actual time is skipped or is larger than one day.
- Analytics includes tasks exactly on the week/month boundary.
- AI returns an empty response, usage metadata is missing, or cost rates are not configured.
- A user changes plan between opening analytics and requesting a premium feature.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a fixed, versioned catalog of prepared avatars and persist only a validated catalog identifier for each user.
- **FR-002**: The system MUST fall back to the default avatar when a stored identifier is absent or unknown.
- **FR-003**: The system MUST persist one AI tone preference per user: `calm`, `moderate` or `strict`, defaulting safely to `calm`.
- **FR-004**: Tone MUST affect only wording and future notification style; it MUST NOT change data access, plan, limits, task mutation or provider routing.
- **FR-005**: Every tone, including Strict, MUST retain explicit safety constraints against humiliation, threats, manipulation and pressure based on vulnerability.
- **FR-006**: The system MUST provide dismissible one-time contextual popovers for task creation, progress navigation, habit tracking, achievement details, analytics periods and settings navigation without adding duplicate onboarding panels to Energy or Mind Hub, changing layout or blocking primary actions.
- **FR-007**: Hint dismissal MUST persist locally per device and MUST be resettable through settings or local application data.
- **FR-008**: My Progress MUST contain separate views for existing XP/levels, task-completion streak and habits.
- **FR-009**: A task-completion streak MUST use stored local calendar completion dates and a documented rule that one or more completed tasks count as an active day.
- **FR-010**: Each user MUST receive at most three confirmed rescue-circle uses per local calendar month, and the same missed date MUST NOT consume more than one circle.
- **FR-011**: Rescue circles MUST never be spent automatically; the user MUST confirm the protected date before the server records it.
- **FR-012**: Habits MUST be stored separately from tasks and support create, daily check, uncheck and archive operations.
- **FR-013**: A habit MUST have at most one check for a given local calendar date.
- **FR-014**: The initial achievement catalog MUST include five completed tasks, a seven-day protected or uninterrupted task streak, and the first habit; awards MUST be idempotent.
- **FR-015**: Tasks MUST support optional positive estimated and actual duration values in whole minutes, each capped at 1,440 minutes.
- **FR-016**: Completing a task MUST record its local completion date; undoing completion MUST clear that date while retaining optional historical actual minutes for later editing.
- **FR-017**: The completion UI MUST offer actual-time entry only after successful completion and MUST allow immediate dismissal.
- **FR-018**: The backend MUST calculate week and month analytics from server-owned user data and MUST isolate every result to the authenticated user.
- **FR-019**: Analytics MUST include completed-task count, energy distribution, current task streak and planned-versus-actual minutes with explicit missing-data states.
- **FR-020**: Premium AI explanations MUST receive aggregate analytics only and MUST NOT receive task titles, descriptions, habit names or message history.
- **FR-021**: Premium analytics access MUST be enforced by the backend for Focus and existing Founder lifetime entitlements.
- **FR-022**: A weekly deep analysis MUST consume 5 daily AI-limit units and a monthly analysis MUST consume 10; insufficient remaining allowance MUST reject the request before contacting a provider.
- **FR-023**: Successful authenticated AI calls MUST update daily provider/model/plan aggregates for requests, token counts and estimated cost without storing prompts or responses.
- **FR-024**: Missing token metadata or cost configuration MUST be represented as unknown rather than fabricated as zero cost.
- **FR-025**: All new mutable profile, progress, habit and analytics endpoints MUST validate input and enforce authentication on the backend.
- **FR-026**: Existing accounts and tasks MUST remain readable and writable after the additive migration; no existing task, user, payment or subscription data may be deleted.
- **FR-027**: Applying any Prisma migration to dev or production MUST remain an explicit owner-operated step after a confirmed backup; the coding agent may only prepare migration files and instructions.
- **FR-028**: Release v2.6.0, email confirmation, password recovery and Yandex/VK OAuth MUST NOT be implemented or modified in this feature.
- **FR-029**: The Landing Page MUST remain unchanged.
- **FR-030**: Product analytics events for habit creation, rescue use and optional time entry MUST exclude task titles, habit titles and other user-authored text.
- **FR-031**: Analytics, streak and habit loading states MUST reserve stable space and show an explanatory Glowy loading state instead of an unlabelled placeholder.
- **FR-032**: The actual-time prompt MUST be owned outside filterable task cards so successful completion cannot unmount it.
- **FR-033**: Task completion and habit mutation controls MUST provide immediate pending or optimistic feedback and MUST prevent duplicate submissions.
- **FR-034**: Habits MUST support title editing, archive, restore and permanent deletion through authenticated owner-scoped endpoints.
- **FR-035**: Each active habit MUST display a fixed five-day strip consisting of the two preceding local dates, today and the two following local dates; future dates MUST NOT be checkable.
- **FR-036**: My Progress MUST expose a separate archived-habits area without mixing archived habits into the active daily list.
- **FR-037**: The achievement catalog MUST contain at least ten stable achievements with an icon, description, encouragement, target, current progress and earned state without requiring a schema migration.
- **FR-038**: Clicking an achievement MUST open an accessible detail dialog, and threshold achievements MUST show a bounded horizontal progress indicator.
- **FR-039**: The task-streak response MUST include the ordered local dates that form the displayed current streak.
- **FR-040**: Task streaks and rescue circles MUST be available to Start, Focus and Founder. Configurable AI tone and week/month deep analysis MUST remain limited to effective Focus and Founder entitlements and be enforced by the backend.
- **FR-041**: Start users MUST retain the safe default Glowy tone and receive a clear upgrade state rather than a non-functional premium selector.
- **FR-042**: Settings MUST provide clear Profile, Subscription, Interface, System and Account navigation sections on large screens while remaining usable as a compact horizontal section selector on mobile.
- **FR-043**: Start-screen preferences MUST include Dashboard, Tasks and Chat and continue to use the existing route architecture.
- **FR-044**: Desktop navigation MUST support a persistent collapsed state with accessible icon labels and a reversible collapse control.
- **FR-045**: Reset-guidance and clear-local-cache actions MUST explain their scope, distinguish reversible from destructive local actions and avoid visually dominant oversized controls.

### Key Entities

- **User preferences**: Prepared avatar identifier and AI tone tied to the existing authenticated user. The legacy beta field remains backward-compatible but no longer gates analytics.
- **Task completion and time**: Existing task plus local completion date, optional estimated minutes and optional actual minutes.
- **Habit**: User-owned recurring action with title, archived state and timestamps.
- **Habit check**: One user-confirmed completion of a habit on one local calendar date.
- **Rescue-circle use**: One user-confirmed protection of a missed local date, counted within its calendar month.
- **Achievement award**: An idempotent record that a user earned a stable catalog achievement key.
- **Daily AI usage aggregate**: User, date, plan, provider, model, request count, token totals and optional estimated cost without prompt content.
- **Analytics snapshot**: Server-calculated period boundaries and aggregate counts returned to the user or passed to premium AI explanation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can select an avatar and AI tone in under 30 seconds and sees both persisted after reload and a second-device sign-in.
- **SC-002**: The task-creation popover appears only on the first form opening, can be closed in one action and never prevents task creation; energy and Mind Hub receive no duplicate onboarding panels.
- **SC-003**: Automated tests cover consecutive days, one missed protected day, month reset and duplicate rescue submissions with deterministic streak results.
- **SC-004**: Habit checks and achievement awards remain duplicate-free under repeated or concurrent requests.
- **SC-005**: Existing tasks with no time data complete, reopen and edit without errors; entering time remains optional in every path.
- **SC-006**: Week and month analytics match a fixed test dataset for all metrics with no discrepancy.
- **SC-007**: Start users receive zero premium AI explanations through UI or direct API, while Focus and Founder users can explicitly request one and spend five weekly or ten monthly AI usage units.
- **SC-008**: AI usage accounting records no prompt or response text and distinguishes unknown cost from configured cost.
- **SC-009**: Typecheck, lint, frontend unit tests, backend tests, production build and focused Playwright flows pass before handoff.
- **SC-010**: No source file, route, UI control or migration in this feature changes email confirmation, password reset or OAuth behavior.
- **SC-011**: The actual-time dialog remains visible after an active task leaves its list and can save a valid duration in one attempt.
- **SC-012**: Active habits update without a full progress reload, archived habits restore correctly, and all five visible day markers retain fixed dimensions on mobile and desktop.
- **SC-013**: At least ten achievements render with distinct icons, accurate progress bounded from zero to target and accessible detail dialogs.
- **SC-014**: A Start user cannot persist a premium tone or request deep AI analytics through a direct API request, while detailed streak data remains available to every authenticated user.
- **SC-015**: Desktop sidebar collapse, Chat start route and every settings section remain usable by keyboard and persist after reload.

## Assumptions

- v2.3.0 uses a prepared local avatar catalog; arbitrary image upload and object storage are deferred until a storage provider and moderation policy are chosen.
- The one-time task-creation popover state is device-local because it is non-critical UI state; user-owned product data and preferences remain server-side. Energy and Mind Hub retain their existing inline explanations without duplicate onboarding UI.
- The browser sends a validated local `YYYY-MM-DD` date when the user completes, checks or protects an item; server timestamps remain authoritative for audit fields.
- Existing completed tasks are backfilled with the UTC date of their last update so historical analytics remains useful, with the limitation documented.
- Founder retains premium product benefits promised to lifetime users and is treated as eligible wherever Focus is eligible.
- AI cost rates are operator-supplied configuration per provider/model. Token counts remain measurable even when a money rate is unavailable.
- v2.3.0-v2.5.0 are delivered in one development branch but remain separate, focused commits and release checkpoints.
