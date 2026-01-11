/*
  Warnings:

  - A unique constraint covering the columns `[paymentExternalId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentExternalId" TEXT,
ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentExternalId_key" ON "Order"("paymentExternalId");
