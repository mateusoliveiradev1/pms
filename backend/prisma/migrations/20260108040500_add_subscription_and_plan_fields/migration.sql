-- Alter Plan to include business rules
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "monthlyPrice" REAL NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 30,
    "limitProducts" INTEGER NOT NULL DEFAULT 100,
    "limitOrders" INTEGER NOT NULL DEFAULT 1000,
    "commissionPercent" REAL NOT NULL DEFAULT 10.0,
    "priorityLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plan" ("id","name","monthlyPrice","cycleDays","createdAt","updatedAt") SELECT "id","name","monthlyPrice","cycleDays","createdAt","updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";

-- Alter Supplier to add scheduledPlanId and keep other fields
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "integrationType" TEXT NOT NULL,
    "shippingDeadline" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "planId" TEXT,
    "financialStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "commissionRate" REAL NOT NULL DEFAULT 10.0,
    "walletBalance" REAL NOT NULL DEFAULT 0.0,
    "nextBillingDate" DATETIME,
    "scheduledPlanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("id","name","integrationType","shippingDeadline","status","planId","financialStatus","commissionRate","walletBalance","nextBillingDate","createdAt","updatedAt")
  SELECT "id","name","integrationType","shippingDeadline","status","planId","financialStatus","commissionRate","walletBalance","nextBillingDate","createdAt","updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_keys=ON;

-- Create SupplierSubscription table
CREATE TABLE "SupplierSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierSubscription_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SupplierSubscription_supplier_status_idx" ON "SupplierSubscription"("supplierId","status");
