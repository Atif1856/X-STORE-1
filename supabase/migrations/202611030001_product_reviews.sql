-- X STORE: Customer Reviews & Ratings
-- Run this once in Supabase SQL Editor.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 5 and 1000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_approved_created_idx
  on public.product_reviews (product_id, is_approved, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "Public can read approved product reviews" on public.product_reviews;
create policy "Public can read approved product reviews"
  on public.product_reviews for select
  to anon, authenticated
  using (is_approved = true);

drop policy if exists "Public can submit pending product reviews" on public.product_reviews;
create policy "Public can submit pending product reviews"
  on public.product_reviews for insert
  to anon, authenticated
  with check (
    is_approved = false
    and char_length(trim(customer_name)) between 2 and 60
    and rating between 1 and 5
    and char_length(trim(review_text)) between 5 and 1000
  );

grant select, insert on public.product_reviews to anon, authenticated;
