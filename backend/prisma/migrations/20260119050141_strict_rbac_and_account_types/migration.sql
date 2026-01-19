/*
  Warnings:

  - The values [ADMIN,SUPPLIER_ADMIN,SUPPLIER_USER,SUPPLIER,USER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The `type` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('SYSTEM_ADMIN', 'ACCOUNT_ADMIN', 'SELLER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "type",
ADD COLUMN     "type" "public"."AccountType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
