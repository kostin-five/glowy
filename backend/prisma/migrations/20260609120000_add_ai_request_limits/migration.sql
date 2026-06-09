ALTER TABLE "users"
ADD COLUMN "ai_requests_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ai_requests_reset_at" TIMESTAMP(3);
