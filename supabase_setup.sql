-- DROPMALLU Supabase Database Setup
-- Run this in your Supabase SQL Editor

-- =====================
-- 1. PRODUCTS TABLE
-- =====================
create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null,
  description text,
  image text,
  badge text default '',
  rating numeric default 4.5,
  reviews integer default 0,
  sku text default '',
  inventory integer default 0,
  stock_status text default '',
  gallery text default '',
  specs text default '',
  created_at timestamp with time zone default now()
);

-- Allow anyone to read products (public store)
alter table products enable row level security;

create policy "Public read products"
  on products for select
  using (true);

create policy "Public insert products"
  on products for insert
  with check (true);

create policy "Public update products"
  on products for update
  using (true);

create policy "Public delete products"
  on products for delete
  using (true);

-- =====================
-- 2. BANNERS (BLOGS) TABLE
-- =====================
create table if not exists banners (
  id text primary key,
  title text not null,
  author text,
  date text,
  "readTime" text,
  image text,
  summary text,
  content text,
  created_at timestamp with time zone default now()
);

-- Allow anyone to read/write banners
alter table banners enable row level security;

create policy "Public read banners"
  on banners for select
  using (true);

create policy "Public insert banners"
  on banners for insert
  with check (true);

create policy "Public update banners"
  on banners for update
  using (true);

create policy "Public delete banners"
  on banners for delete
  using (true);
