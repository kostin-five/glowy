-- AddColumns
ALTER TABLE "users"
  ADD COLUMN "avatar_id" VARCHAR(40),
  ADD COLUMN "ai_tone" TEXT NOT NULL DEFAULT 'calm',
  ADD COLUMN "focus_beta_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tasks"
  ADD COLUMN "completed_on" VARCHAR(10),
  ADD COLUMN "estimated_minutes" INTEGER,
  ADD COLUMN "actual_minutes" INTEGER;

-- Preserve a best-effort completion day for legacy completed tasks.
UPDATE "tasks"
SET "completed_on" = TO_CHAR("updated_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE "completed" = true AND "completed_on" IS NULL;

-- CreateTables
CREATE TABLE "habits" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "habit_checks" (
  "id" SERIAL NOT NULL,
  "habit_id" INTEGER NOT NULL,
  "completed_on" VARCHAR(10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "habit_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "streak_rescues" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "protected_on" VARCHAR(10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "streak_rescues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "achievements" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "key" VARCHAR(60) NOT NULL,
  "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage_daily" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "usage_date" VARCHAR(10) NOT NULL,
  "plan" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "tokenized_requests" INTEGER NOT NULL DEFAULT 0,
  "priced_requests" INTEGER NOT NULL DEFAULT 0,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_microusd" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "habits_user_id_archived_idx" ON "habits"("user_id", "archived");
CREATE UNIQUE INDEX "habit_checks_habit_id_completed_on_key" ON "habit_checks"("habit_id", "completed_on");
CREATE INDEX "habit_checks_completed_on_idx" ON "habit_checks"("completed_on");
CREATE UNIQUE INDEX "streak_rescues_user_id_protected_on_key" ON "streak_rescues"("user_id", "protected_on");
CREATE UNIQUE INDEX "achievements_user_id_key_key" ON "achievements"("user_id", "key");
CREATE UNIQUE INDEX "ai_usage_daily_user_id_usage_date_plan_provider_model_key" ON "ai_usage_daily"("user_id", "usage_date", "plan", "provider", "model");
CREATE INDEX "ai_usage_daily_usage_date_plan_idx" ON "ai_usage_daily"("usage_date", "plan");

-- AddForeignKeys
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_checks" ADD CONSTRAINT "habit_checks_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "streak_rescues" ADD CONSTRAINT "streak_rescues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
