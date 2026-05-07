-- Run in Supabase: Dashboard → SQL Editor → New query → Run (not Explain).
-- Select ALL lines before Run. A partial paste causes: syntax error at end of input.
-- Idempotent. Creates profiles + brands if missing (fixes "table public.brands not in schema cache").
-- Brands only: use bootstrap_brands_only.sql

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_url text,
  add column if not exists company_role text,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

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
