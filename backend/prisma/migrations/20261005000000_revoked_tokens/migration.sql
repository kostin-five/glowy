CREATE TABLE "revoked_tokens" (
    "fingerprint" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("fingerprint")
);
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");
