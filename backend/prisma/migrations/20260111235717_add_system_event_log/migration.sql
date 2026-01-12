-- CreateTable
CREATE TABLE "SystemEventLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemEventLog_level_idx" ON "SystemEventLog"("level");

-- CreateIndex
CREATE INDEX "SystemEventLog_source_idx" ON "SystemEventLog"("source");

-- CreateIndex
CREATE INDEX "SystemEventLog_createdAt_idx" ON "SystemEventLog"("createdAt");
