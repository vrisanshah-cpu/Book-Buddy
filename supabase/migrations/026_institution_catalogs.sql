-- Phase O: institutional book catalogs — a school or company can upload
-- their own library's holdings so kids see "available at your school"
-- badges when searching/discovering.

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  type text not null check (type in ('school', 'company')),
  created_at timestamptz not null default now()
);

create table if not exists public.institution_books (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  isbn text not null,
  title text not null,
  author text not null,
  available_copies int not null default 1,
  primary key (institution_id, isbn)
);

alter table public.users add column if not exists institution_id uuid references public.institutions(id) on delete set null;
alter table public.classrooms add column if not exists institution_id uuid references public.institutions(id) on delete set null;

create index if not exists institution_books_title_idx on public.institution_books (lower(title));

alter table public.institutions enable row level security;
alter table public.institution_books enable row level security;

drop policy if exists "institutions_select" on public.institutions;
create policy "institutions_select" on public.institutions for select to authenticated using (true);

drop policy if exists "institutions_admin_manage" on public.institutions;
create policy "institutions_admin_manage" on public.institutions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "institution_books_select" on public.institution_books;
create policy "institution_books_select" on public.institution_books for select to authenticated using (true);

drop policy if exists "institution_books_admin_manage" on public.institution_books;
create policy "institution_books_admin_manage" on public.institution_books for all
  using (public.is_admin())
  with check (public.is_admin());
