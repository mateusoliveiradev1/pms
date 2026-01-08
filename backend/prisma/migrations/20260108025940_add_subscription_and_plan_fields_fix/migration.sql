-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "billingDoc" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "billingName" TEXT;

-- RedefineIndex
DROP INDEX "SupplierSubscription_supplier_status_idx";
CREATE INDEX "SupplierSubscription_supplierId_status_idx" ON "SupplierSubscription"("supplierId", "status");
