-- ============================================================
-- Lab Manager: Initial Database Schema
-- Cell Culture Experiment Schedule & Lab Notebook
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. Profiles (extends Supabase Auth users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  google_refresh_token text, -- for Google Calendar API
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Protocols (Experiment Templates)
-- ============================================================
create table public.protocols (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.protocols enable row level security;

create policy "Users can view own protocols"
  on public.protocols for select using (auth.uid() = user_id or is_public = true);
create policy "Users can create protocols"
  on public.protocols for insert with check (auth.uid() = user_id);
create policy "Users can update own protocols"
  on public.protocols for update using (auth.uid() = user_id);
create policy "Users can delete own protocols"
  on public.protocols for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. Protocol Steps (Template Steps)
-- ============================================================
create table public.protocol_steps (
  id uuid default uuid_generate_v4() primary key,
  protocol_id uuid references public.protocols(id) on delete cascade not null,
  relative_day integer not null, -- Day -1, Day 0, Day 1, etc.
  title text not null,
  description text,
  sort_order integer default 0,
  created_at timestamptz default now() not null
);

alter table public.protocol_steps enable row level security;

create policy "Users can view protocol steps"
  on public.protocol_steps for select using (
    exists (
      select 1 from public.protocols
      where protocols.id = protocol_steps.protocol_id
      and (protocols.user_id = auth.uid() or protocols.is_public = true)
    )
  );
create policy "Users can manage own protocol steps"
  on public.protocol_steps for insert with check (
    exists (
      select 1 from public.protocols
      where protocols.id = protocol_steps.protocol_id
      and protocols.user_id = auth.uid()
    )
  );
create policy "Users can update own protocol steps"
  on public.protocol_steps for update using (
    exists (
      select 1 from public.protocols
      where protocols.id = protocol_steps.protocol_id
      and protocols.user_id = auth.uid()
    )
  );
create policy "Users can delete own protocol steps"
  on public.protocol_steps for delete using (
    exists (
      select 1 from public.protocols
      where protocols.id = protocol_steps.protocol_id
      and protocols.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Experiments (Launched from Protocol)
-- ============================================================
create type experiment_status as enum ('active', 'completed', 'archived');

create table public.experiments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  protocol_id uuid references public.protocols(id) on delete set null,
  name text not null,
  start_date date not null, -- Day 0 actual date
  status experiment_status default 'active' not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.experiments enable row level security;

create policy "Users can view own experiments"
  on public.experiments for select using (auth.uid() = user_id);
create policy "Users can create experiments"
  on public.experiments for insert with check (auth.uid() = user_id);
create policy "Users can update own experiments"
  on public.experiments for update using (auth.uid() = user_id);
create policy "Users can delete own experiments"
  on public.experiments for delete using (auth.uid() = user_id);

-- ============================================================
-- 5. Tasks (Experiment Steps with actual dates)
-- ============================================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  experiment_id uuid references public.experiments(id) on delete cascade not null,
  step_id uuid references public.protocol_steps(id) on delete set null,
  title text not null,
  description text,
  relative_day integer not null,
  actual_date date not null, -- calculated: start_date + relative_day
  is_completed boolean default false,
  notes text,
  image_url text, -- Supabase Storage path
  google_event_id text, -- for preventing duplicate Google Calendar events
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select using (
    exists (
      select 1 from public.experiments
      where experiments.id = tasks.experiment_id
      and experiments.user_id = auth.uid()
    )
  );
create policy "Users can create tasks"
  on public.tasks for insert with check (
    exists (
      select 1 from public.experiments
      where experiments.id = tasks.experiment_id
      and experiments.user_id = auth.uid()
    )
  );
create policy "Users can update own tasks"
  on public.tasks for update using (
    exists (
      select 1 from public.experiments
      where experiments.id = tasks.experiment_id
      and experiments.user_id = auth.uid()
    )
  );
create policy "Users can delete own tasks"
  on public.tasks for delete using (
    exists (
      select 1 from public.experiments
      where experiments.id = tasks.experiment_id
      and experiments.user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Indexes for performance
-- ============================================================
create index idx_protocol_steps_protocol on public.protocol_steps(protocol_id);
create index idx_experiments_user on public.experiments(user_id);
create index idx_experiments_status on public.experiments(status);
create index idx_tasks_experiment on public.tasks(experiment_id);
create index idx_tasks_actual_date on public.tasks(actual_date);
create index idx_tasks_completed on public.tasks(is_completed);

-- ============================================================
-- 7. Updated_at trigger function
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger update_protocols_updated_at
  before update on public.protocols
  for each row execute procedure public.update_updated_at();

create trigger update_experiments_updated_at
  before update on public.experiments
  for each row execute procedure public.update_updated_at();

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- 8. Storage Bucket for cell images
-- ============================================================
-- Run this in Supabase Dashboard > Storage, or via API:
--
-- Bucket name: "cell-images"
-- Public: false (private, accessed via signed URLs)
-- Allowed MIME types: image/png, image/jpeg, image/webp, image/tiff
-- Max file size: 10MB
--
-- Storage RLS policies:
-- INSERT: auth.uid() is not null (authenticated users can upload)
-- SELECT: auth.uid() is not null (authenticated users can view)
-- DELETE: owner matches auth.uid()

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cell-images',
  'cell-images',
  false,
  10485760, -- 10MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/tiff']
);

-- Storage policies
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check (bucket_id = 'cell-images' and auth.role() = 'authenticated');

create policy "Users can view own images"
  on storage.objects for select
  using (bucket_id = 'cell-images' and auth.role() = 'authenticated');

create policy "Users can delete own images"
  on storage.objects for delete
  using (bucket_id = 'cell-images' and auth.uid()::text = (storage.foldername(name))[1]);
