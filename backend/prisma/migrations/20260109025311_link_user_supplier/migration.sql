-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "integrationType" TEXT NOT NULL,
    "shippingDeadline" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "planId" TEXT,
    "financialStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "commissionRate" REAL NOT NULL DEFAULT 10.0,
    "walletBalance" REAL NOT NULL DEFAULT 0.0,
    "pendingBalance" REAL NOT NULL DEFAULT 0.0,
    "blockedBalance" REAL NOT NULL DEFAULT 0.0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "nextBillingDate" DATETIME,
    "scheduledPlanId" TEXT,
    "billingName" TEXT,
    "billingDoc" TEXT,
    "billingAddress" TEXT,
    "billingEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Supplier_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("billingAddress", "billingDoc", "billingEmail", "billingName", "blockedBalance", "commissionRate", "createdAt", "financialStatus", "id", "integrationType", "name", "nextBillingDate", "pendingBalance", "planId", "scheduledPlanId", "shippingDeadline", "status", "updatedAt", "verificationStatus", "walletBalance") SELECT "billingAddress", "billingDoc", "billingEmail", "billingName", "blockedBalance", "commissionRate", "createdAt", "financialStatus", "id", "integrationType", "name", "nextBillingDate", "pendingBalance", "planId", "scheduledPlanId", "shippingDeadline", "status", "updatedAt", "verificationStatus", "walletBalance" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE INDEX "Supplier_userId_idx" ON "Supplier"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
