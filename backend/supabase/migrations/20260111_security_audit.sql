-- ==============================================================================
-- SECURITY HARDENING AUDIT - 2026-01-11
-- ==============================================================================

-- 1. LEDGER IMMUTABILITY (CHECK 1)
-- Prevent UPDATE and DELETE on FinancialLedger table
-- This ensures the ledger is append-only at the database level.

CREATE OR REPLACE FUNCTION public.prevent_ledger_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'FinancialLedger is immutable. UPDATE is not allowed.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'FinancialLedger is immutable. DELETE is not allowed.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_changes ON public."FinancialLedger";

CREATE TRIGGER trg_prevent_ledger_changes
BEFORE UPDATE OR DELETE ON public."FinancialLedger"
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_changes();


-- 2. STORAGE SECURITY (CHECK 3)
-- Revoke direct client-side uploads for 'receipts' bucket.
-- Only the Backend (Service Role) should be able to upload files.

-- Drop the policy that allows Suppliers to upload directly
DROP POLICY IF EXISTS "Suppliers can upload receipts" ON storage.objects;

-- Ensure View policies are strict
DROP POLICY IF EXISTS "Suppliers can view own receipts" ON storage.objects;
CREATE POLICY "Suppliers can view own receipts"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;
CREATE POLICY "Admins can view all receipts"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'receipts' AND public.is_admin() );


-- 3. RLS CONFIRMATION (CHECK 2)
-- Ensure 'FinancialLedger' is RLS enabled (Should be already, but enforcing)
ALTER TABLE public."FinancialLedger" ENABLE ROW LEVEL SECURITY;

-- Ensure Policies for Ledger are SELECT only for Suppliers
DROP POLICY IF EXISTS "Suppliers can view their ledger" ON public."FinancialLedger";
CREATE POLICY "Suppliers can view their ledger"
  ON public."FinancialLedger" FOR SELECT
  USING ( public.is_supplier_owner("supplierId") );

DROP POLICY IF EXISTS "Admins can view all ledger" ON public."FinancialLedger";
CREATE POLICY "Admins can view all ledger"
  ON public."FinancialLedger" FOR SELECT
  USING ( public.is_admin() );

-- Admins *can* insert (via API usually, but policy allows if needed)
-- But Service Role is preferred.
DROP POLICY IF EXISTS "Admins can insert ledger" ON public."FinancialLedger";
CREATE POLICY "Admins can insert ledger"
  ON public."FinancialLedger" FOR INSERT
  WITH CHECK ( public.is_admin() );

-- ==============================================================================
-- AUDIT COMPLETE
-- ==============================================================================
