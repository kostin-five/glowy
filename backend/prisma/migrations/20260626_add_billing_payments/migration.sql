ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'start';
ALTER TABLE "users" ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE "users" ADD COLUMN "plan_expires_at" TIMESTAMP(3);

CREATE TABLE "payments" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'yookassa',
  "provider_payment_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "amount_kopeks" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "confirmation_url" TEXT,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
