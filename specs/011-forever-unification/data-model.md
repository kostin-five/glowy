# Data Model: Единый пожизненный тариф Forever

Новых сущностей и миграций нет.

## Lifetime entitlement

- `User.plan`: существующее значение `forever`.
- `User.subscriptionStatus`: `active` для доступного плана.
- `User.planExpiresAt`: `null` для бессрочного доступа.
- Публичное значение: `forever` без alias.
- AI limit: 100 через существующую server-side plan matrix.

## State transitions

- Existing Forever active → остаётся Forever active.
- Start/Focus → не может перейти в Forever через legacy free activation.
- Manual existing-data assignment → Forever active после обычного чтения профиля.
- Future paid Forever → остаётся disabled feature, переход не входит в scope.
