-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
