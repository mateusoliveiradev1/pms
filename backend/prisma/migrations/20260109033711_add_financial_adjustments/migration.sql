-- AlterTable
ALTER TABLE "FinancialLedger" ADD COLUMN "releaseDate" DATETIME;

-- CreateTable
CREATE TABLE "FinancialSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "defaultReleaseDays" INTEGER NOT NULL DEFAULT 14,
    "defaultMinWithdrawal" REAL NOT NULL DEFAULT 50.0,
    "defaultWithdrawalLimit" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "withdrawalLimit" INTEGER NOT NULL DEFAULT 4,
    "minWithdrawal" REAL NOT NULL DEFAULT 50.0,
    "releaseDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plan" ("commissionPercent", "createdAt", "cycleDays", "id", "limitOrders", "limitProducts", "monthlyPrice", "name", "priorityLevel", "updatedAt") SELECT "commissionPercent", "createdAt", "cycleDays", "id", "limitOrders", "limitProducts", "monthlyPrice", "name", "priorityLevel", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
