ALTER TABLE "users" RENAME COLUMN "login" TO "email";

ALTER INDEX "users_login_key" RENAME TO "users_email_key";
