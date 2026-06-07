ALTER TABLE "users"
RENAME COLUMN "energy_limit" TO "current_energy";

ALTER TABLE "users"
DROP COLUMN "energy_date";
