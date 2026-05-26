-- AlterTable
ALTER TABLE "users" ADD COLUMN     "energy_date" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "energy_limit" INTEGER NOT NULL DEFAULT 100;
