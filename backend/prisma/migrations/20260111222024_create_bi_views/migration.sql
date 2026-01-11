-- Create View: daily_financial_summary
CREATE OR REPLACE VIEW daily_financial_summary AS
WITH daily_orders AS (
    SELECT
        DATE("createdAt") as date,
        SUM("totalAmount") as total_gmv,
        SUM("commissionValue") as total_commission,
        SUM("netValue") as total_net_revenue
    FROM "Order"
    WHERE "status" = 'PAID' OR "paymentStatus" = 'PAID'
    GROUP BY DATE("createdAt")
),
daily_ledger AS (
    SELECT
        DATE("createdAt") as date,
        -- Pending In: Money entering pending state
        SUM(CASE WHEN "type" IN ('ORDER_CREDIT_PENDING', 'ORDER_REFUND_OFFSET') THEN "amount" ELSE 0 END) as pending_in,
        -- Pending Out: Money leaving pending state (Released)
        SUM(CASE WHEN "type" = 'BALANCE_RELEASE' THEN "amount" ELSE 0 END) as pending_out,
        -- Available In: Money entering available state (Released)
        SUM(CASE WHEN "type" = 'BALANCE_RELEASE' THEN "amount" ELSE 0 END) as available_in,
        -- Available Out: Money leaving available state (Withdrawals, etc)
        SUM(CASE WHEN "type" IN ('WITHDRAWAL', 'ADJUSTMENT') THEN "amount" ELSE 0 END) as available_out
    FROM "FinancialLedger"
    GROUP BY DATE("createdAt")
)
SELECT
    COALESCE(o.date, l.date) as date,
    COALESCE(o.total_gmv, 0) as total_gmv,
    COALESCE(o.total_commission, 0) as total_commission,
    COALESCE(o.total_net_revenue, 0) as total_net_revenue,
    -- Cumulative Calculations (Window Functions)
    SUM(COALESCE(l.pending_in, 0) - COALESCE(l.pending_out, 0)) OVER (ORDER BY COALESCE(o.date, l.date)) as total_pending_balance,
    SUM(COALESCE(l.available_in, 0) + COALESCE(l.available_out, 0)) OVER (ORDER BY COALESCE(o.date, l.date)) as total_available_balance
FROM daily_orders o
FULL OUTER JOIN daily_ledger l ON o.date = l.date;

-- Create View: supplier_financial_kpis
CREATE OR REPLACE VIEW supplier_financial_kpis AS
SELECT
    s.id as "supplierId",
    s.name as "supplierName",
    -- Wallet Snapshot
    s."walletBalance" as "available_balance",
    s."pendingBalance" as "pending_balance",
    -- Aggregates
    COALESCE(orders.gmv_total, 0) as "gmv_total",
    COALESCE(orders.commission_total, 0) as "commission_total",
    COALESCE(orders.net_revenue, 0) as "net_revenue",
    COALESCE(withdrawals.withdrawals_total, 0) as "withdrawals_total",
    COALESCE(withdrawals.withdrawals_pending, 0) as "withdrawals_pending"
FROM "Supplier" s
LEFT JOIN (
    SELECT
        "supplierId",
        SUM("totalAmount") as gmv_total,
        SUM("commissionValue") as commission_total,
        SUM("netValue") as net_revenue
    FROM "Order"
    WHERE "status" != 'CANCELLED'
    GROUP BY "supplierId"
) orders ON s.id = orders."supplierId"
LEFT JOIN (
    SELECT
        "supplierId",
        SUM(CASE WHEN "status" IN ('PAID', 'APPROVED') THEN "amount" ELSE 0 END) as withdrawals_total,
        SUM(CASE WHEN "status" = 'PENDING' THEN "amount" ELSE 0 END) as withdrawals_pending
    FROM "WithdrawalRequest"
    GROUP BY "supplierId"
) withdrawals ON s.id = withdrawals."supplierId";

-- Create View: financial_anomalies_view
CREATE OR REPLACE VIEW financial_anomalies_view AS
-- 1. Negative Balance
SELECT
    'NEGATIVE_BALANCE' as type,
    id::text as "referenceId",
    name || ' (Wallet: ' || "walletBalance" || ', Pending: ' || "pendingBalance" || ')' as description,
    "walletBalance" as severity_value,
    NOW() as "detectedAt"
FROM "Supplier"
WHERE "walletBalance" < 0 OR "pendingBalance" < 0

UNION ALL

-- 2. Ledger Orphan (No Order ID for Order types)
SELECT
    'LEDGER_ORPHAN',
    id::text,
    'Ledger entry ' || "type" || ' missing referenceId',
    "amount",
    "createdAt"
FROM "FinancialLedger"
WHERE "type" IN ('ORDER_PAYMENT', 'ORDER_CREDIT_PENDING') AND "referenceId" IS NULL

UNION ALL

-- 3. Pending Credit Stuck (Pending > 30 days)
SELECT
    'STUCK_PENDING',
    id::text,
    'Credit pending since ' || "createdAt"::date,
    "amount",
    "createdAt"
FROM "FinancialLedger"
WHERE "type" = 'ORDER_CREDIT_PENDING' 
  AND "status" = 'PENDING' 
  AND "createdAt" < NOW() - INTERVAL '30 days'

UNION ALL

-- 4. Withdrawal > Available
SELECT
    'RISKY_WITHDRAWAL',
    w.id::text,
    'Withdrawal ' || w.amount || ' > Available ' || s."walletBalance",
    w.amount - s."walletBalance",
    w."requestedAt"
FROM "WithdrawalRequest" w
JOIN "Supplier" s ON w."supplierId" = s.id
WHERE w."status" = 'PENDING' AND w.amount > s."walletBalance";
