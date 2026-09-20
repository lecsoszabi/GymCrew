-- ============================================================================
--  GymCrew Szeged — adatbázis séma
--  Futtatás: Supabase Dashboard → SQL Editor → beilleszt → Run
--  Utána futtasd le a seed_gyms.sql fájlt is.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. TÁBLÁK
-- ---------------------------------------------------------------------------

-- Szegedi kondik (OpenStreetMap-ből, lásd seed_gyms.sql)
create table if not exists public.gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  lat         double precision not null,
  lng         double precision not null,
  osm_ref     text unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Csoportok. Egy csoportnak egy főnöke (owner) és egy aktuális kondija van.
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 40),
  invite_code text not null unique,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  gym_id      uuid references public.gyms(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Profil + testadatok. A group_id EGYETLEN oszlop → egy ember egyszerre 1 csoportban.
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null check (char_length(btrim(display_name)) between 2 and 40),
  avatar_url        text,
  group_id          uuid references public.groups(id) on delete set null,
  height_cm         numeric(5,1) check (height_cm between 100 and 250),
  weight_kg         numeric(5,1) check (weight_kg between 30 and 300),
  birth_date        date check (birth_date > '1920-01-01' and birth_date < current_date),
  sex               text check (sex in ('male','female','other')),
  goal              text check (goal in ('muscle','strength','fat_loss','fitness','health','other')),
  experience_level  text check (experience_level in ('beginner','intermediate','advanced')),
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Célzott meghívók (e-mail alapján). A kód alapú belépés emellett is működik.
create table if not exists public.group_invites (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups(id) on delete cascade,
  invited_email  text not null check (position('@' in invited_email) > 1),
  invited_by     uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','declined','revoked')),
  created_at     timestamptz not null default now(),
  unique (group_id, invited_email)
);

-- Tervezett / megbeszélt edzések
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  gym_id       uuid references public.gyms(id) on delete set null,
  starts_at    timestamptz not null,
  duration_min int not null default 90 check (duration_min between 15 and 300),
  created_by   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'proposed'
               check (status in ('proposed','confirmed','cancelled','done')),
  note         text check (note is null or char_length(note) <= 300),
  created_at   timestamptz not null default now()
);
create index if not exists sessions_group_start_idx on public.sessions (group_id, starts_at desc);

-- Szavazatok. NEM esetén az indok adatbázis szinten kötelező.
create table if not exists public.session_votes (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vote       text not null check (vote in ('yes','maybe','no')),
  reason     text check (reason is null or char_length(reason) <= 300),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id),
  constraint no_vote_needs_reason
    check (vote <> 'no' or (reason is not null and char_length(btrim(reason)) >= 3))
);

-- Heti rendszeres ráérés → ebből számoljuk a "mindenkinek jó" idősávokat.
-- weekday: 0 = hétfő … 6 = vasárnap. start_min/end_min: percek éjféltől.
create table if not exists public.availability (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),
  start_min int not null check (start_min between 0 and 1439),
  end_min   int not null check (end_min between 1 and 1440),
  constraint availability_range check (end_min > start_min),
  unique (user_id, weekday, start_min, end_min)
);

-- Napi szándék ("ma megyek / ma nem"). Nem esetén kötelező indok.
create table if not exists public.daily_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  group_id   uuid not null references public.groups(id) on delete cascade,
  day        date not null default (now() at time zone 'Europe/Budapest')::date,
  going      boolean not null,
  from_time  time,
  to_time    time,
  reason     text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, day),
  constraint decline_needs_reason
    check (going or (reason is not null and char_length(btrim(reason)) >= 3))
);
create index if not exists daily_checkins_group_day_idx on public.daily_checkins (group_id, day);

-- Megérkezés a kondiba (ebből jönnek a statok)
create table if not exists public.check_ins (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete set null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  gym_id     uuid references public.gyms(id) on delete set null,
  arrived_at timestamptz not null default now(),
  source     text not null default 'auto' check (source in ('auto','manual')),
  unique (session_id, user_id)
);
create index if not exists check_ins_user_time_idx on public.check_ins (user_id, arrived_at desc);

-- ---------------------------------------------------------------------------
-- 2. SEGÉDFÜGGVÉNYEK
-- ---------------------------------------------------------------------------

-- A saját csoportom id-ja. SECURITY DEFINER, hogy az RLS policy-k ne legyenek rekurzívak.
create or replace function public.my_group_id()
returns uuid language sql stable security definer set search_path = public as $$
  select group_id from public.profiles where id = auth.uid()
$$;

-- SECURITY DEFINER, hogy ne függjön attól, kapott-e a szerep jogot az auth sémára.
create or replace function public.my_email()
returns text language sql stable security definer set search_path = public, auth as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_group_owner(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups g where g.id = p_group and g.owner_id = auth.uid())
$$;

-- Ütközésmentes, jól olvasható meghívókód (nincs benne 0/O/1/I)
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end $$;

-- Új regisztrációnál automatikusan készül profil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A csoport-tagságot senki nem írhatja át közvetlenül; csak az alábbi
-- SECURITY DEFINER függvények, amelyek ellenőrzik a szabályokat.
create or replace function public.guard_profile_group()
returns trigger language plpgsql as $$
begin
  if new.group_id is distinct from old.group_id
     and coalesce(current_setting('app.group_change', true), '') <> 'on' then
    raise exception 'A csoporttagság csak a csoport-függvényeken keresztül módosítható';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard_group on public.profiles;
create trigger profiles_guard_group
  before update on public.profiles
  for each row execute function public.guard_profile_group();

-- Az edzés kényes mezőit az RLS önmagában nem tudja védeni (nem lát rá a
-- régi értékre), ezért triggerrel őrizzük: a termet csak a főnök válthatja,
-- az edzés nem vándorolhat másik csoportba, és a készítője sem írható át.
create or replace function public.guard_session_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is distinct from old.group_id then
    raise exception 'Az edzés nem helyezhető át másik csoportba';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Az edzés készítője nem módosítható';
  end if;
  if new.gym_id is distinct from old.gym_id
     and not public.is_group_owner(new.group_id) then
    raise exception 'A termet csak a csoport főnöke állíthatja át';
  end if;
  return new;
end $$;

drop trigger if exists sessions_guard_write on public.sessions;
create trigger sessions_guard_write
  before update on public.sessions
  for each row execute function public.guard_session_write();

-- ---------------------------------------------------------------------------
-- 3. CSOPORT-MŰVELETEK (RPC)
-- ---------------------------------------------------------------------------

create or replace function public.create_group(p_name text, p_gym_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then raise exception 'Nem vagy bejelentkezve'; end if;

  if (select group_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Már tagja vagy egy csoportnak. Előbb lépj ki belőle.';
  end if;

  insert into public.groups (name, invite_code, owner_id, gym_id)
  values (btrim(p_name), public.gen_invite_code(), auth.uid(), p_gym_id)
  returning id into v_group;

  perform set_config('app.group_change', 'on', true);
  update public.profiles set group_id = v_group where id = auth.uid();
  perform set_config('app.group_change', 'off', true);

  return v_group;
end $$;

create or replace function public.join_group_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then raise exception 'Nem vagy bejelentkezve'; end if;

  if (select group_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Már tagja vagy egy csoportnak. Egy ember egyszerre csak egy csoportban lehet.';
  end if;

  select id into v_group from public.groups
   where invite_code = upper(btrim(p_code));

  if v_group is null then raise exception 'Nincs ilyen meghívókód'; end if;

  perform set_config('app.group_change', 'on', true);
  update public.profiles set group_id = v_group where id = auth.uid();
  perform set_config('app.group_change', 'off', true);

  update public.group_invites
     set status = 'accepted'
   where group_id = v_group and invited_email = public.my_email() and status = 'pending';

  return v_group;
end $$;

create or replace function public.accept_invite(p_invite uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.group_invites
   where id = p_invite and invited_email = public.my_email() and status = 'pending';

  if v_group is null then raise exception 'A meghívó nem található vagy már nem érvényes'; end if;

  if (select group_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Már tagja vagy egy csoportnak. Előbb lépj ki belőle.';
  end if;

  perform set_config('app.group_change', 'on', true);
  update public.profiles set group_id = v_group where id = auth.uid();
  perform set_config('app.group_change', 'off', true);

  update public.group_invites set status = 'accepted' where id = p_invite;
  return v_group;
end $$;

create or replace function public.leave_group()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_group   uuid := public.my_group_id();
  v_next    uuid;
  v_members int;
begin
  if v_group is null then return; end if;

  select count(*) into v_members from public.profiles where group_id = v_group;

  perform set_config('app.group_change', 'on', true);
  update public.profiles set group_id = null where id = auth.uid();
  perform set_config('app.group_change', 'off', true);

  -- Ha a főnök lép ki: a legrégebbi tag örökli a csoportot, üres csoport törlődik.
  if exists (select 1 from public.groups where id = v_group and owner_id = auth.uid()) then
    if v_members <= 1 then
      delete from public.groups where id = v_group;
    else
      select id into v_next from public.profiles
       where group_id = v_group order by created_at asc limit 1;
      update public.groups set owner_id = v_next where id = v_group;
    end if;
  end if;
end $$;

create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_group uuid := public.my_group_id();
begin
  if v_group is null or not public.is_group_owner(v_group) then
    raise exception 'Csak a csoport főnöke távolíthat el tagot';
  end if;
  if p_user = auth.uid() then
    raise exception 'Magadat nem tudod eltávolítani — használd a "Kilépés" gombot';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and group_id = v_group) then
    raise exception 'Ez a felhasználó nem tagja a csoportnak';
  end if;

  perform set_config('app.group_change', 'on', true);
  update public.profiles set group_id = null where id = p_user;
  perform set_config('app.group_change', 'off', true);
end $$;

create or replace function public.transfer_ownership(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_group uuid := public.my_group_id();
begin
  if v_group is null or not public.is_group_owner(v_group) then
    raise exception 'Csak a jelenlegi főnök adhatja át a csoportot';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and group_id = v_group) then
    raise exception 'Ez a felhasználó nem tagja a csoportnak';
  end if;
  update public.groups set owner_id = p_user where id = v_group;
end $$;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.gyms           enable row level security;
alter table public.groups         enable row level security;
alter table public.profiles       enable row level security;
alter table public.group_invites  enable row level security;
alter table public.sessions       enable row level security;
alter table public.session_votes  enable row level security;
alter table public.availability   enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.check_ins      enable row level security;

-- gyms: minden bejelentkezett felhasználó olvashatja, senki nem írhatja
drop policy if exists gyms_read on public.gyms;
create policy gyms_read on public.gyms
  for select to authenticated using (true);

-- groups: a sajátomat látom; a főnök módosíthatja/törölheti
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups
  for select to authenticated
  using (
    id = public.my_group_id()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.group_invites i
       where i.group_id = groups.id
         and i.invited_email = public.my_email()
         and i.status = 'pending'
    )
  );

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete to authenticated using (owner_id = auth.uid());

-- profiles: magamat és a csoporttársaimat látom; csak magamat írhatom
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (group_id is not null and group_id = public.my_group_id())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- group_invites: a nekem szólót és a saját csoportom meghívóit látom
drop policy if exists invites_read on public.group_invites;
create policy invites_read on public.group_invites
  for select to authenticated
  using (invited_email = public.my_email() or group_id = public.my_group_id());

drop policy if exists invites_insert on public.group_invites;
create policy invites_insert on public.group_invites
  for insert to authenticated
  with check (public.is_group_owner(group_id) and invited_by = auth.uid());

drop policy if exists invites_update on public.group_invites;
create policy invites_update on public.group_invites
  for update to authenticated
  using (invited_email = public.my_email() or public.is_group_owner(group_id))
  with check (invited_email = public.my_email() or public.is_group_owner(group_id));

drop policy if exists invites_delete on public.group_invites;
create policy invites_delete on public.group_invites
  for delete to authenticated using (public.is_group_owner(group_id));

-- sessions: a csoportom edzései
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions
  for select to authenticated using (group_id = public.my_group_id());

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (group_id = public.my_group_id() and created_by = auth.uid());

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
  for update to authenticated
  using (group_id = public.my_group_id()) with check (group_id = public.my_group_id());

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
  for delete to authenticated
  using (group_id = public.my_group_id()
         and (created_by = auth.uid() or public.is_group_owner(group_id)));

-- session_votes: a csoportom szavazatait látom, csak a sajátomat írom
drop policy if exists votes_read on public.session_votes;
create policy votes_read on public.session_votes
  for select to authenticated
  using (exists (select 1 from public.sessions s
                  where s.id = session_id and s.group_id = public.my_group_id()));

drop policy if exists votes_write on public.session_votes;
create policy votes_write on public.session_votes
  for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.sessions s
                 where s.id = session_id and s.group_id = public.my_group_id()));

drop policy if exists votes_update on public.session_votes;
create policy votes_update on public.session_votes
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists votes_delete on public.session_votes;
create policy votes_delete on public.session_votes
  for delete to authenticated using (user_id = auth.uid());

-- availability: a csoporttársaimét látom (ebből jön a közös idősáv), magamét írom
drop policy if exists avail_read on public.availability;
create policy avail_read on public.availability
  for select to authenticated
  using (user_id = auth.uid()
    or exists (select 1 from public.profiles p
                where p.id = user_id and p.group_id = public.my_group_id()));

drop policy if exists avail_write on public.availability;
create policy avail_write on public.availability
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- daily_checkins: a csoportom mai jelzéseit látom, magamét írom
drop policy if exists daily_read on public.daily_checkins;
create policy daily_read on public.daily_checkins
  for select to authenticated using (group_id = public.my_group_id());

drop policy if exists daily_write on public.daily_checkins;
create policy daily_write on public.daily_checkins
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and group_id = public.my_group_id());

-- check_ins: a csoportom megérkezéseit látom, magamét írom
drop policy if exists checkins_read on public.check_ins;
create policy checkins_read on public.check_ins
  for select to authenticated
  using (user_id = auth.uid()
    or exists (select 1 from public.profiles p
                where p.id = user_id and p.group_id = public.my_group_id()));

drop policy if exists checkins_write on public.check_ins;
create policy checkins_write on public.check_ins
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. REALTIME
-- ---------------------------------------------------------------------------

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.sessions';       exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.session_votes';  exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.daily_checkins'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.check_ins';      exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.profiles';       exception when others then null; end;
end $$;

-- Élő pozíciók: privát broadcast csatorna csoportonként ("loc:<group_id>").
-- A pozíciók NEM kerülnek adatbázisba — elillanó üzenetek, így a free tier nem fogy.
do $$
begin
  execute $p$
    drop policy if exists "gymcrew location channel read" on realtime.messages;
    create policy "gymcrew location channel read" on realtime.messages
      for select to authenticated
      using (realtime.topic() = 'loc:' || coalesce(public.my_group_id()::text, '-'));

    drop policy if exists "gymcrew location channel write" on realtime.messages;
    create policy "gymcrew location channel write" on realtime.messages
      for insert to authenticated
      with check (realtime.topic() = 'loc:' || coalesce(public.my_group_id()::text, '-'));
  $p$;
exception when others then
  raise notice 'Realtime policy kihagyva (%). A csatorna a csoport UUID-jével így is védett.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 6. STORAGE — profilképek
-- ---------------------------------------------------------------------------

-- Publikus olvasás, de 2 MB-os méret- és szigorú típuskorláttal: így a
-- tárhelyet nem lehet teleszemetelni, és nem tölthető fel tetszőleges fájl.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  execute $p$
    drop policy if exists "avatars public read" on storage.objects;
    create policy "avatars public read" on storage.objects
      for select using (bucket_id = 'avatars');

    drop policy if exists "avatars owner write" on storage.objects;
    create policy "avatars owner write" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

    drop policy if exists "avatars owner update" on storage.objects;
    create policy "avatars owner update" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

    drop policy if exists "avatars owner delete" on storage.objects;
    create policy "avatars owner delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  $p$;
exception when others then
  raise notice 'Storage policy kihagyva (%). Hozd létre kézzel az avatars bucketot.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 7. JOGOSULTSÁGOK
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on public.gyms to authenticated;
grant select, insert, update, delete on
  public.groups, public.profiles, public.group_invites, public.sessions,
  public.session_votes, public.availability, public.daily_checkins, public.check_ins
  to authenticated;

grant execute on function
  public.my_group_id(), public.my_email(), public.is_group_owner(uuid),
  public.create_group(text, uuid), public.join_group_by_code(text),
  public.accept_invite(uuid), public.leave_group(),
  public.remove_member(uuid), public.transfer_ownership(uuid)
  to authenticated;
