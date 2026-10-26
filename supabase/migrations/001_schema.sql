-- KRISZ App adatbázis: alkalmak, hírek, AI-javaslatok, források, szerkesztők, értesítési feliratkozások

create table public.editors (
  email text primary key
);

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.editors
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create table public.events (
  id text primary key,
  title text not null,
  start_date date,
  end_date date,
  orgs text[] not null default '{KRISZ}',
  place text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  url text not null default '',
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.news (
  id bigint generated always as identity primary key,
  published_on date not null,
  title text not null,
  body text not null default '',
  url text not null default ''
);

create table public.sources (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null,
  detail text not null default '',
  status text not null default 'Beolvasva',
  checked_at timestamptz
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('update', 'new', 'gap')),
  event_id text,
  title text not null,
  changes jsonb not null default '{}',
  new_event jsonb,
  source text not null default '',
  reason text not null default '',
  is_private boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);

create table public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.editors enable row level security;
alter table public.events enable row level security;
alter table public.news enable row level security;
alter table public.sources enable row level security;
alter table public.suggestions enable row level security;
alter table public.push_subscriptions enable row level security;

-- Mindenki olvashatja a nyilvános alkalmakat és a híreket; a szerkesztők mindent látnak.
create policy "public events" on public.events for select using (is_public or public.is_editor());
create policy "editors write events" on public.events for all using (public.is_editor()) with check (public.is_editor());
create policy "public news" on public.news for select using (true);
create policy "editors write news" on public.news for all using (public.is_editor()) with check (public.is_editor());

-- Javaslatok és források csak szerkesztőknek.
create policy "editors read suggestions" on public.suggestions for select using (public.is_editor());
create policy "editors read sources" on public.sources for select using (public.is_editor());
create policy "editors see self" on public.editors for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Bárki feliratkozhat értesítésre, de a listát senki nem olvashatja a böngészőből.
create policy "anyone subscribes" on public.push_subscriptions for insert with check (true);

-- Javaslat jóváhagyása: egy lépésben alkalmazza a változást és lezárja a javaslatot.
create or replace function public.decide_suggestion(sid uuid, approve boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  s public.suggestions;
  ch jsonb;
  ne jsonb;
begin
  if not public.is_editor() then
    raise exception 'Nincs szerkesztői jogosultság';
  end if;
  select * into s from public.suggestions where id = sid and status = 'pending' for update;
  if not found then
    raise exception 'A javaslat már nem vár döntésre';
  end if;

  if approve and s.kind = 'update' then
    ch := s.changes;
    update public.events set
      title       = coalesce(ch ->> 'title', title),
      start_date  = coalesce((ch ->> 'start_date')::date, start_date),
      end_date    = coalesce((ch ->> 'end_date')::date, end_date),
      place       = coalesce(ch ->> 'place', place),
      description = coalesce(ch ->> 'description', description),
      url         = coalesce(ch ->> 'url', url),
      updated_at  = now()
    where id = s.event_id;
  elsif approve and s.kind = 'new' then
    ne := s.new_event;
    insert into public.events (id, title, start_date, end_date, orgs, place, description, tags, url, is_public)
    values (
      ne ->> 'id', ne ->> 'title', (ne ->> 'start_date')::date, (ne ->> 'end_date')::date,
      coalesce(array(select jsonb_array_elements_text(ne -> 'orgs')), '{KRISZ}'),
      coalesce(ne ->> 'place', ''), coalesce(ne ->> 'description', ''),
      coalesce(array(select jsonb_array_elements_text(ne -> 'tags')), '{}'),
      coalesce(ne ->> 'url', ''), true
    )
    on conflict (id) do nothing;
  end if;

  update public.suggestions
     set status = case when approve then 'approved' else 'dismissed' end,
         decided_at = now(),
         decided_by = auth.jwt() ->> 'email'
   where id = sid;
  return s.kind;
end;
$$;

revoke all on function public.decide_suggestion(uuid, boolean) from public, anon;
grant execute on function public.decide_suggestion(uuid, boolean) to authenticated;
