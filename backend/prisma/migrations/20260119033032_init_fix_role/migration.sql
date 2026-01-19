/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SYSTEM_ADMIN', 'ADMIN', 'ACCOUNT_ADMIN', 'SUPPLIER_ADMIN', 'SUPPLIER_USER', 'SUPPLIER', 'USER');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'SUPPLIER';
