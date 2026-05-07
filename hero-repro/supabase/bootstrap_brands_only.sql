-- Run in Supabase SQL Editor if `profiles` already exists but `brands` is missing.
-- Paste this whole block, then click Run (not Explain).

create extension if not exists pgcrypto;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  domain text,
  logo_url text,
  color text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.brands enable row level security;

drop policy if exists "Users manage own brands" on public.brands;

create policy "Users manage own brands"
  on public.brands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists brands_user_id on public.brands (user_id);
