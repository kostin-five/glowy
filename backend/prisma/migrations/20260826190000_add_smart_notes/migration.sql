-- Additive v2.7.0 migration. Prepared locally; do not apply to shared databases
-- without the separately approved backup and migration procedure.
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "note_task_links" (
    "id" SERIAL NOT NULL,
    "note_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "note_task_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_user_id_archived_updated_at_idx"
ON "notes"("user_id", "archived", "updated_at");
CREATE INDEX "note_task_links_task_id_idx" ON "note_task_links"("task_id");
CREATE UNIQUE INDEX "note_task_links_note_id_task_id_key"
ON "note_task_links"("note_id", "task_id");

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_task_links" ADD CONSTRAINT "note_task_links_note_id_fkey"
FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_task_links" ADD CONSTRAINT "note_task_links_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
