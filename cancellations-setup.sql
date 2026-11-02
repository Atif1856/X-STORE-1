-- X STORE: cancellation request queue (admin only)
create table if not exists public.cancellation_requests (
 id uuid primary key default gen_random_uuid(),
 request_number text not null unique,
 order_id uuid not null references public.orders(id) on delete restrict,
 customer_name text not null,
 customer_phone text not null,
 reason text,
 status text not null default 'pending_review' check(status in ('pending_review','approved','rejected','cancelled')),
 admin_note text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists cancellation_requests_status_idx on public.cancellation_requests(status,created_at desc);
alter table public.cancellation_requests enable row level security;
drop policy if exists "Cancellation admins manage requests" on public.cancellation_requests;
create policy "Cancellation admins manage requests" on public.cancellation_requests
 for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.cancellation_requests to authenticated;
