-- X STORE Return & Refund System
-- Run this migration in Supabase SQL Editor before enabling the customer return UI.
-- Existing orders/products/order_items are preserved.

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists delivered_at timestamptz;

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  reason text not null check (reason in ('damaged','defective','wrong_item')),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','pickup_scheduled','item_received','inspection_completed','refund_processing','refund_completed','cancelled')),
  admin_note text,
  reviewed_at timestamptz,
  refund_amount numeric(12,2) check (refund_amount is null or refund_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.return_request_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(return_id, order_item_id)
);

create table if not exists public.return_status_history (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.refund_transactions (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null check (method in ('original_payment_method','bank_transfer','easypaisa','jazzcash','replacement')),
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  provider_reference text,
  admin_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists return_requests_order_idx on public.return_requests(order_id, created_at desc);
create index if not exists return_requests_status_idx on public.return_requests(status, created_at desc);
create index if not exists return_items_order_item_idx on public.return_request_items(order_item_id);
create index if not exists return_history_request_idx on public.return_status_history(return_id, created_at);
create index if not exists refund_transactions_return_idx on public.refund_transactions(return_id, created_at desc);

alter table public.return_requests enable row level security;
alter table public.return_request_items enable row level security;
alter table public.return_status_history enable row level security;
alter table public.refund_transactions enable row level security;

drop policy if exists "Return admins manage requests" on public.return_requests;
create policy "Return admins manage requests" on public.return_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Return admins manage items" on public.return_request_items;
create policy "Return admins manage items" on public.return_request_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Return admins manage history" on public.return_status_history;
create policy "Return admins manage history" on public.return_status_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Return admins manage refunds" on public.refund_transactions;
create policy "Return admins manage refunds" on public.refund_transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.return_requests to authenticated;
grant select, insert, update, delete on public.return_request_items to authenticated;
grant select, insert, update, delete on public.return_status_history to authenticated;
grant select, insert, update, delete on public.refund_transactions to authenticated;

-- Private bucket for evidence photos. Only admins can access until the
-- authenticated/guest Edge Function issues short-lived signed upload URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-evidence', 'return-evidence', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Return evidence admin access" on storage.objects;
create policy "Return evidence admin access" on storage.objects
  for all to authenticated
  using (bucket_id = 'return-evidence' and public.is_admin())
  with check (bucket_id = 'return-evidence' and public.is_admin());

-- Deliberately no public insert/select policy and no anonymous table access.
-- Guest OTP verification and request creation must be implemented in a
-- rate-limited Supabase Edge Function before the guest form is enabled.
