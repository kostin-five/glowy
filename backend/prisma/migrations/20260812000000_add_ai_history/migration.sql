CREATE TABLE "ai_conversations" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_exchanges" (
  "id" SERIAL NOT NULL,
  "conversation_id" INTEGER NOT NULL,
  "client_request_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "user_text" TEXT NOT NULL,
  "assistant_text" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "ai_exchanges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_task_drafts" (
  "id" SERIAL NOT NULL,
  "conversation_id" INTEGER NOT NULL,
  "exchange_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "energy_level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subtasks" JSONB NOT NULL,
  "created_task_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_task_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_conversations_user_id_key" ON "ai_conversations"("user_id");
CREATE UNIQUE INDEX "ai_exchanges_conversation_id_client_request_id_key" ON "ai_exchanges"("conversation_id", "client_request_id");
CREATE INDEX "ai_exchanges_conversation_id_id_idx" ON "ai_exchanges"("conversation_id", "id");
CREATE UNIQUE INDEX "ai_task_drafts_created_task_id_key" ON "ai_task_drafts"("created_task_id");
CREATE INDEX "ai_task_drafts_conversation_id_status_idx" ON "ai_task_drafts"("conversation_id", "status");
CREATE INDEX "ai_task_drafts_exchange_id_idx" ON "ai_task_drafts"("exchange_id");

ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_exchanges" ADD CONSTRAINT "ai_exchanges_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_task_drafts" ADD CONSTRAINT "ai_task_drafts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_task_drafts" ADD CONSTRAINT "ai_task_drafts_exchange_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "ai_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_task_drafts" ADD CONSTRAINT "ai_task_drafts_created_task_id_fkey" FOREIGN KEY ("created_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
