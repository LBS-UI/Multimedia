-- Run this in the Supabase SQL editor.
-- Do not drop existing tables if you already have data.

create table if not exists events (
  id text primary key,
  name text not null,
  date text,
  description text,
  image text,
  location text,
  poster_color text,
  created_at timestamptz default now()
);

create table if not exists announcements (
  id text primary key,
  title text not null,
  content text,
  image text,
  category text,
  date text,
  posted_at timestamptz default now(),
  pinned boolean default false,
  author text,
  updated_at timestamptz default now()
);

create table if not exists member_messages (
  id bigint generated always as identity primary key,
  username text,
  role text,
  text text,
  created_at timestamptz default now()
);

alter table events enable row level security;
alter table announcements enable row level security;
alter table member_messages enable row level security;

create policy "public read events" on events for select using (true);
create policy "public write events" on events for insert with check (true);
create policy "public update events" on events for update using (true);
create policy "public delete events" on events for delete using (true);

create policy "public read announcements" on announcements for select using (true);
create policy "public write announcements" on announcements for insert with check (true);
create policy "public update announcements" on announcements for update using (true);
create policy "public delete announcements" on announcements for delete using (true);

create policy "public read messages" on member_messages for select using (true);
create policy "public write messages" on member_messages for insert with check (true);
create policy "public update messages" on member_messages for update using (true);
create policy "public delete messages" on member_messages for delete using (true);
