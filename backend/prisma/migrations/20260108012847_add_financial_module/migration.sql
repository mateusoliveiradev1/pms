-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "monthlyPrice" REAL NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderId" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialLedger_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mercadoLivreId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalAmount" REAL NOT NULL,
    "trackingCode" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "supplierId" TEXT,
    "marketplaceFee" REAL NOT NULL DEFAULT 0.0,
    "platformCommission" REAL NOT NULL DEFAULT 0.0,
    "supplierPayout" REAL NOT NULL DEFAULT 0.0,
    "financialStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerAddress", "customerName", "id", "mercadoLivreId", "status", "totalAmount", "trackingCode", "updatedAt") SELECT "createdAt", "customerAddress", "customerName", "id", "mercadoLivreId", "status", "totalAmount", "trackingCode", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_mercadoLivreId_key" ON "Order"("mercadoLivreId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("createdAt", "id", "integrationType", "name", "shippingDeadline", "status", "updatedAt") SELECT "createdAt", "id", "integrationType", "name", "shippingDeadline", "status", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
