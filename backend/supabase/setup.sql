-- Enable RLS on all tables
alter table "User" enable row level security;
alter table "Supplier" enable row level security;
alter table "Order" enable row level security;
alter table "FinancialLedger" enable row level security;
alter table "WithdrawalRequest" enable row level security;
alter table "AdminLog" enable row level security;

-- Helper Function for Admin Check
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public."User"
    where id = auth.uid() and role = 'ADMIN'
  );
end;
$$ language plpgsql security definer;

-- Helper Function for Supplier Owner Check
create or replace function is_supplier_owner(supplier_id text)
returns boolean as $$
begin
  return exists (
    select 1 from public."Supplier"
    where id = supplier_id and "userId" = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- ==========================================
-- USER POLICIES
-- ==========================================
create policy "Users can view their own data" on "User"
  for select using (auth.uid() = id);

create policy "Admins can view all users" on "User"
  for select using (is_admin());

-- ==========================================
-- SUPPLIER POLICIES
-- ==========================================
create policy "Suppliers can view their own profile" on "Supplier"
  for select using ("userId" = auth.uid());

create policy "Admins can view all suppliers" on "Supplier"
  for all using (is_admin());

-- ==========================================
-- ORDER POLICIES
-- ==========================================
create policy "Suppliers can view their orders" on "Order"
  for select using (is_supplier_owner("supplierId"));

create policy "Admins can view all orders" on "Order"
  for all using (is_admin());

-- ==========================================
-- LEDGER POLICIES (APPEND ONLY)
-- ==========================================
create policy "Suppliers can view their ledger" on "FinancialLedger"
  for select using (is_supplier_owner("supplierId"));

create policy "Admins can view all ledger" on "FinancialLedger"
  for select using (is_admin());

-- Only backend (service role) should insert/update ledger ideally, 
-- but if we allow Admin via API:
create policy "Admins can insert ledger" on "FinancialLedger"
  for insert with check (is_admin());

-- NO UPDATE/DELETE allowed for anyone on Ledger (Enforced by not adding policies)
-- Except maybe Admin for corrections? User said "Ledger sem UPDATE/DELETE".
-- So we won't add Update/Delete policies. Service Role bypasses RLS anyway.

-- ==========================================
-- AUTH SYNC TRIGGER
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, name, role, status, "createdAt", "updatedAt")
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    coalesce(new.raw_user_meta_data->>'role', 'SUPPLIER'), 
    'ACTIVE',
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- STORAGE (RECEIPTS)
-- ==========================================
-- BUCKET SETUP
-- ==========================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Suppliers can upload receipts"
  on storage.objects for insert
  with check ( bucket_id = 'receipts' and auth.role() = 'authenticated' ); 
  -- Further restriction: folder name matches supplier ID? 
  -- For now, simple authenticated upload.

create policy "Suppliers can view own receipts"
  on storage.objects for select
  using ( bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1] );
  -- Assumes structure: receipts/{userId}/{filename}

create policy "Admins can view all receipts"
  on storage.objects for select
  using ( bucket_id = 'receipts' and is_admin() );

-- ==========================================
-- VIEWS (KPIs)
-- ==========================================
create or replace view view_supplier_stats as
select 
  "supplierId",
  sum(case when status = 'COMPLETED' and type in ('SALE_REVENUE', 'BALANCE_RELEASE') then amount else 0 end) as total_received,
  sum(case when status = 'PENDING' then amount else 0 end) as total_pending
from "FinancialLedger"
group by "supplierId";

create or replace view view_admin_stats as
select 
  date_trunc('month', "createdAt") as month,
  sum(case when type = 'SALE_COMMISSION' then amount else 0 end) as total_commission,
  count(distinct "orderId") as total_orders
from "FinancialLedger"
group by 1;
