-- Create Indexes for BI Performance
CREATE INDEX IF NOT EXISTS "FinancialLedger_createdAt_idx" ON "FinancialLedger"("createdAt");
CREATE INDEX IF NOT EXISTS "FinancialLedger_type_idx" ON "FinancialLedger"("type");
CREATE INDEX IF NOT EXISTS "FinancialLedger_status_idx" ON "FinancialLedger"("status");

CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");

CREATE INDEX IF NOT EXISTS "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
