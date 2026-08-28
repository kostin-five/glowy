# Quickstart: Validate Behavior Modes and Rhythm Calendar

Do not use production data, production env or real user text. Database-backed manual checks require an explicitly selected local/dev database; automated backend suites remain database-free.

## 1. Automated baseline

```bash
cd backend
npx prisma validate
npm test
cd ..
npm run typecheck
npm run lint
npm run test -- --run
npm run build
CI=1 npx playwright test
```

Expected: all checks pass; PWA first-install navigation regression stays green; `src/pages/LandingPage.tsx` is unchanged.

## 2. Behavior copy

For the same neutral and missed-task fixture, validate calm support, moderate neutral action and strict factual accountability. None may insult, threaten, shame, discriminate, diagnose or criticize the person's worth.

## 3. XP matrix

| Mode | Other overdue active task | Completing current task | Expected delta |
| --- | --- | --- | --- |
| calm | yes/no | any first completion | normal positive reward |
| moderate | no | first completion | normal positive reward |
| moderate | yes | non-overdue task | 0 |
| strict | no | first completion | normal positive reward |
| strict | yes | non-overdue task | negative normal reward, clamped at XP 0 |
| moderate/strict | target itself is overdue | no other overdue | normal positive reward |

Repeat every completion and verify no second delta. Cover HTTP and Telegram service with identical fixtures. Verify level thresholds and no blocking task details in response/logs.

## 4. Task cards

At light/dark and 320/430/desktop widths verify duration visibility, strict overdue red date, unchanged calm/moderate date and absence of empty duration placeholders.

## 5. Rhythm calendar

Use fixtures spanning month/year boundaries and leap February. Grid has seven columns and 35 or 42 cells; all six states and legend match; rescue differs from completion; future navigation is disabled; no horizontal scroll at 320/360/390/430 px.

## 6. Rescue matrix

1. `D-2` active, `D-1` empty, remaining > 0 → `D-1` eligible.
2. `D-2` empty → no candidate.
3. `D-1` active/rescued → no candidate.
4. Any protected date other than `D-1` → rejected.
5. Monthly limit exhausted → no mutation.
6. Duplicate request → no second row/use.

## 7. Offline and real dev smoke

Load tasks online, switch modes, complete offline with/without blocker, restore network and verify server XP becomes authoritative once. In Telegram verify `+XP`, `0 XP` and `-XP` messaging without another task's title.

Production migration, env, services and deploy are out of scope. No schema change is expected.
