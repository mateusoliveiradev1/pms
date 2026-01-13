/*
  Warnings:

  - Made the column `accountId` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- DropForeignKey
ALTER TABLE "Supplier" DROP CONSTRAINT "Supplier_accountId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "defaultCommissionRate" DOUBLE PRECISION,
ADD COLUMN     "onboardingStatus" TEXT NOT NULL DEFAULT 'COMPLETO',
ADD COLUMN     "planId" TEXT NOT NULL DEFAULT 'basic';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxExternalSuppliers" INTEGER,
ADD COLUMN     "maxInternalSuppliers" INTEGER,
ADD COLUMN     "maxSuppliers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "withdrawalFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "rankingScore" DOUBLE PRECISION,
ADD COLUMN     "slaViolationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supplierType" "SupplierType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "withdrawalFeeRate" DOUBLE PRECISION,
ALTER COLUMN "accountId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SupplierCommission" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "overridePlanRate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCommission_supplierId_accountId_key" ON "SupplierCommission"("supplierId", "accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommission" ADD CONSTRAINT "SupplierCommission_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommission" ADD CONSTRAINT "SupplierCommission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
