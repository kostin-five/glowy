-- AlterTable
ALTER TABLE "sub_tasks" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill a stable initial order for existing subtasks inside each task.
WITH ordered_subtasks AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "task_id"
            ORDER BY "created_at" ASC, "id" ASC
        ) - 1 AS "new_position"
    FROM "sub_tasks"
)
UPDATE "sub_tasks"
SET "position" = ordered_subtasks."new_position"
FROM ordered_subtasks
WHERE "sub_tasks"."id" = ordered_subtasks."id";
