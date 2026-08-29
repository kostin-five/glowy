# Research: Единый пожизненный тариф Forever

## Decision: сохранить stored value `forever`

**Rationale**: текущая БД уже хранит пожизненный доступ как `forever`; Founder создаётся только при формировании публичного ответа. Поэтому миграция добавила бы риск без пользы.

**Alternatives considered**: хранить `founder`; мигрировать существующие записи; поддерживать оба публичных имени. Все варианты отклонены как лишняя совместимость.

## Decision: legacy activation отвечает 410 без mutation

**Rationale**: контролируемый 410 объясняет старому клиенту, что сценарий закрыт, и легко тестируется до database work.

**Alternatives considered**: удалить route; оставить скрытым; требовать admin secret. Скрытый route остаётся уязвимым, admin secret создаёт ненужный новый operational flow.

## Decision: ручное назначение использует существующее значение

**Rationale**: владелец может назначить `plan=forever`, active status и null expiry существующим способом; отдельный публичный endpoint для этого не нужен.

## Decision: не включать paid Forever

**Rationale**: цена, YooKassa и юридические условия будущего lifetime checkout не согласованы. Текущий feature flag остаётся выключенным.
