-- Add optional product color variants for X STORE
alter table public.products
  add column if not exists colors text[] not null default '{}';
