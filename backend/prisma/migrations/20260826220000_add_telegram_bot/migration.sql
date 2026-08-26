-- Additive v2.8.0 migration. Prepared locally; do not apply to shared databases
-- without explicit approval and a newly confirmed Timeweb backup.
CREATE TABLE "telegram_connections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "telegram_user_id" VARCHAR(32) NOT NULL,
    "chat_id" VARCHAR(32) NOT NULL,
    "pending_command" VARCHAR(20),
    "pending_command_expires_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_link_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_link_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_task_drafts" (
    "id" UUID NOT NULL,
    "connection_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "date" VARCHAR(10) NOT NULL DEFAULT '',
    "priority" VARCHAR(50) NOT NULL DEFAULT '⚡️ P2',
    "energy_level" VARCHAR(10) NOT NULL DEFAULT 'med',
    "category" VARCHAR(100) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "task_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "source_update_id" VARCHAR(32),
    CONSTRAINT "telegram_task_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_webhook_updates" (
    "update_id" VARCHAR(32) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error_code" VARCHAR(60),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "telegram_webhook_updates_pkey" PRIMARY KEY ("update_id")
);

CREATE UNIQUE INDEX "telegram_connections_user_id_key" ON "telegram_connections"("user_id");
CREATE UNIQUE INDEX "telegram_connections_telegram_user_id_key" ON "telegram_connections"("telegram_user_id");
CREATE UNIQUE INDEX "telegram_link_codes_code_hash_key" ON "telegram_link_codes"("code_hash");
CREATE INDEX "telegram_link_codes_user_id_expires_at_idx" ON "telegram_link_codes"("user_id", "expires_at");
CREATE UNIQUE INDEX "telegram_task_drafts_task_id_key" ON "telegram_task_drafts"("task_id");
CREATE UNIQUE INDEX "telegram_task_drafts_source_update_id_key" ON "telegram_task_drafts"("source_update_id");
CREATE INDEX "telegram_task_drafts_user_id_status_expires_at_idx" ON "telegram_task_drafts"("user_id", "status", "expires_at");
CREATE INDEX "telegram_task_drafts_connection_id_status_idx" ON "telegram_task_drafts"("connection_id", "status");
CREATE INDEX "telegram_webhook_updates_status_available_at_created_at_idx" ON "telegram_webhook_updates"("status", "available_at", "created_at");

ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_task_drafts" ADD CONSTRAINT "telegram_task_drafts_connection_id_fkey"
FOREIGN KEY ("connection_id") REFERENCES "telegram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_task_drafts" ADD CONSTRAINT "telegram_task_drafts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_task_drafts" ADD CONSTRAINT "telegram_task_drafts_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
