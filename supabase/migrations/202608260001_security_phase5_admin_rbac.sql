begin;

alter table public.rooms add column if not exists land_status text not null default 'public';
alter table public.rooms add column if not exists price_hum numeric(18, 2);

do $$ begin
  alter table public.rooms add constraint rooms_land_status
    check (land_status in ('public', 'available', 'owned', 'reserved'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.rooms add constraint rooms_price_hum
    check (price_hum is null or price_hum between 0 and 1000000000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.rooms add constraint rooms_top_percent
    check (top ~ '^(100|[0-9]{1,2})(\.[0-9]{1,2})?%$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.rooms add constraint rooms_left_percent
    check (left ~ '^(100|[0-9]{1,2})(\.[0-9]{1,2})?%$');
exception when duplicate_object then null; end $$;

create table if not exists public.admin_roles (
  user_id text primary key references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_roles_internal_user check (user_id ~ '^user_[0-9a-f]{64}$'),
  constraint admin_roles_role check (role in ('owner', 'editor'))
);

create table if not exists public.published_room_layouts (
  room_id text primary key references public.rooms(id) on delete cascade,
  version bigint not null default 1,
  definition jsonb,
  published_by text not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_layout_version check (version >= 1),
  constraint published_layout_object check (definition is null or jsonb_typeof(definition) = 'object'),
  constraint published_layout_room_match check (definition is null or definition ->> 'id' = room_id),
  constraint published_layout_size check (definition is null or octet_length(definition::text) <= 245760),
  constraint published_layout_no_world_session check (definition is null or definition::text !~ 'session_[0-9A-Fa-f]{128}')
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id text not null references public.profiles(id) on delete restrict,
  action text not null,
  target_resource_type text not null,
  target_resource_id text not null,
  resulting_version bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_actor check (actor_user_id ~ '^user_[0-9a-f]{64}$'),
  constraint admin_audit_action check (action in ('role.bootstrap', 'role.set', 'role.delete', 'room.metadata.update', 'room.layout.publish', 'room.layout.reset')),
  constraint admin_audit_target_type check (target_resource_type in ('role', 'room', 'room_layout')),
  constraint admin_audit_target_id check (char_length(target_resource_id) between 1 and 96),
  constraint admin_audit_version check (resulting_version is null or resulting_version >= 0),
  constraint admin_audit_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint admin_audit_metadata_size check (octet_length(metadata::text) <= 2048),
  constraint admin_audit_no_world_session check (metadata::text !~ 'session_[0-9A-Fa-f]{128}')
);

create index if not exists admin_roles_role_idx on public.admin_roles(role);
create index if not exists published_room_layouts_published_by_idx on public.published_room_layouts(published_by);
create index if not exists admin_audit_actor_created_idx on public.admin_audit_log(actor_user_id, created_at desc);
create index if not exists admin_audit_target_created_idx on public.admin_audit_log(target_resource_type, target_resource_id, created_at desc);

drop trigger if exists admin_roles_set_updated_at on public.admin_roles;
create trigger admin_roles_set_updated_at before update on public.admin_roles
for each row execute function public.set_human_world_updated_at();
drop trigger if exists published_layouts_set_updated_at on public.published_room_layouts;
create trigger published_layouts_set_updated_at before update on public.published_room_layouts
for each row execute function public.set_human_world_updated_at();

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'immutable_audit';
end;
$$;

drop trigger if exists admin_audit_immutable on public.admin_audit_log;
create trigger admin_audit_immutable before update or delete on public.admin_audit_log
for each row execute function public.prevent_admin_audit_mutation();

create or replace function public.require_admin_capability(p_actor_user_id text, p_capability text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.admin_roles where user_id = p_actor_user_id;
  if actor_role is null then raise exception 'admin_invariant'; end if;
  if p_capability = 'roles:manage' and actor_role <> 'owner' then raise exception 'admin_invariant'; end if;
  if p_capability = 'rooms:write' and actor_role not in ('owner', 'editor') then raise exception 'admin_invariant'; end if;
  return actor_role;
end;
$$;

create or replace function public.admin_bootstrap_owner(p_target_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role text;
begin
  if p_target_user_id !~ '^user_[0-9a-f]{64}$' then raise exception 'admin_invariant'; end if;
  perform 1 from public.profiles where id = p_target_user_id;
  if not found then raise exception 'admin_invariant'; end if;
  select role into previous_role from public.admin_roles where user_id = p_target_user_id for update;
  if previous_role = 'owner' then return; end if;
  insert into public.admin_roles(user_id, role) values (p_target_user_id, 'owner')
  on conflict (user_id) do update set role = 'owner';
  insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, metadata)
  values (p_target_user_id, 'role.bootstrap', 'role', p_target_user_id, jsonb_build_object('role', 'owner'));
end;
$$;

create or replace view public.admin_role_directory
with (security_invoker = true)
as
select ar.user_id, p.username, ar.role, ar.created_at, ar.updated_at
from public.admin_roles ar
join public.profiles p on p.id = ar.user_id;

create or replace function public.admin_set_role(p_actor_user_id text, p_target_user_id text, p_assigned_role text)
returns table(user_id text, username text, role text, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role text;
begin
  perform public.require_admin_capability(p_actor_user_id, 'roles:manage');
  if p_target_user_id !~ '^user_[0-9a-f]{64}$' or p_assigned_role not in ('owner', 'editor') then raise exception 'admin_invariant'; end if;
  perform 1 from public.profiles where id = p_target_user_id;
  if not found then raise exception 'admin_invariant'; end if;
  lock table public.admin_roles in share row exclusive mode;
  select ar.role into previous_role from public.admin_roles ar where ar.user_id = p_target_user_id;
  if previous_role = 'owner' and p_assigned_role <> 'owner'
    and (select count(*) from public.admin_roles where admin_roles.role = 'owner') <= 1 then
    raise exception 'last_owner';
  end if;
  insert into public.admin_roles(user_id, role) values (p_target_user_id, p_assigned_role)
  on conflict (user_id) do update set role = excluded.role;
  if previous_role is distinct from p_assigned_role then
    insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, metadata)
    values (p_actor_user_id, 'role.set', 'role', p_target_user_id, jsonb_build_object('role', p_assigned_role));
  end if;
  return query select d.user_id, d.username, d.role, d.created_at, d.updated_at
    from public.admin_role_directory d where d.user_id = p_target_user_id;
end;
$$;

create or replace function public.admin_delete_role(p_actor_user_id text, p_target_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role text;
begin
  perform public.require_admin_capability(p_actor_user_id, 'roles:manage');
  lock table public.admin_roles in share row exclusive mode;
  select ar.role into previous_role from public.admin_roles ar where ar.user_id = p_target_user_id;
  if previous_role is null then return; end if;
  if previous_role = 'owner' and (select count(*) from public.admin_roles where role = 'owner') <= 1 then raise exception 'last_owner'; end if;
  delete from public.admin_roles where user_id = p_target_user_id;
  insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, metadata)
  values (p_actor_user_id, 'role.delete', 'role', p_target_user_id, jsonb_build_object('previousRole', previous_role));
end;
$$;

create or replace function public.admin_update_room_metadata(
  p_actor_user_id text, p_room_id text, p_room_name text, p_room_type text,
  p_room_capacity integer, p_room_is_public boolean, p_room_top text, p_room_left text,
  p_room_land_status text, p_room_price_hum numeric
)
returns setof public.rooms
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin_capability(p_actor_user_id, 'rooms:write');
  return query update public.rooms set
    name = p_room_name, type = p_room_type, capacity = p_room_capacity,
    is_public = p_room_is_public, top = p_room_top, left = p_room_left,
    land_status = p_room_land_status, price_hum = p_room_price_hum
    where id = p_room_id returning *;
  if not found then raise exception 'admin_invariant'; end if;
  insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, metadata)
  values (p_actor_user_id, 'room.metadata.update', 'room', p_room_id,
    jsonb_build_object('capacity', p_room_capacity, 'isPublic', p_room_is_public, 'landStatus', p_room_land_status));
end;
$$;

create or replace function public.admin_publish_room_layout(
  p_actor_user_id text, p_room_id text, p_expected_version bigint, p_layout_definition jsonb
)
returns table(room_id text, version bigint, definition jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  next_version bigint;
begin
  perform public.require_admin_capability(p_actor_user_id, 'rooms:write');
  perform 1 from public.rooms where id = p_room_id for update;
  if not found then raise exception 'admin_invariant'; end if;
  select prl.version into current_version from public.published_room_layouts prl where prl.room_id = p_room_id for update;
  if current_version is null then
    if p_expected_version <> 0 then raise exception 'version_conflict'; end if;
    next_version := 1;
    insert into public.published_room_layouts(room_id, version, definition, published_by)
    values (p_room_id, next_version, p_layout_definition, p_actor_user_id);
  else
    if current_version <> p_expected_version then raise exception 'version_conflict'; end if;
    next_version := current_version + 1;
    update public.published_room_layouts set version = next_version, definition = p_layout_definition, published_by = p_actor_user_id
    where published_room_layouts.room_id = p_room_id;
  end if;
  insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, resulting_version, metadata)
  values (p_actor_user_id, 'room.layout.publish', 'room_layout', p_room_id, next_version, jsonb_build_object('version', next_version));
  return query select prl.room_id, prl.version, prl.definition, prl.updated_at
    from public.published_room_layouts prl where prl.room_id = p_room_id;
end;
$$;

create or replace function public.admin_reset_room_layout(p_actor_user_id text, p_room_id text, p_expected_version bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version bigint;
  next_version bigint;
begin
  perform public.require_admin_capability(p_actor_user_id, 'rooms:write');
  perform 1 from public.rooms where id = p_room_id for update;
  if not found then raise exception 'admin_invariant'; end if;
  select prl.version into current_version from public.published_room_layouts prl where prl.room_id = p_room_id for update;
  if current_version is null then
    if p_expected_version <> 0 then raise exception 'version_conflict'; end if;
    next_version := 1;
    insert into public.published_room_layouts(room_id, version, definition, published_by)
    values (p_room_id, next_version, null, p_actor_user_id);
  else
    if current_version <> p_expected_version then raise exception 'version_conflict'; end if;
    next_version := current_version + 1;
    update public.published_room_layouts set version = next_version, definition = null, published_by = p_actor_user_id
    where room_id = p_room_id;
  end if;
  insert into public.admin_audit_log(actor_user_id, action, target_resource_type, target_resource_id, resulting_version, metadata)
  values (p_actor_user_id, 'room.layout.reset', 'room_layout', p_room_id, next_version,
    jsonb_build_object('previousVersion', coalesce(current_version, 0), 'version', next_version));
  return next_version;
end;
$$;

alter table public.admin_roles enable row level security;
alter table public.admin_roles force row level security;
alter table public.published_room_layouts enable row level security;
alter table public.published_room_layouts force row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

revoke all on table public.admin_roles, public.published_room_layouts, public.admin_audit_log from anon, authenticated;
revoke all on public.admin_role_directory from anon, authenticated;
revoke all on sequence public.admin_audit_log_id_seq from anon, authenticated;
grant select, insert, update, delete on table public.admin_roles, public.published_room_layouts to service_role;
grant select, insert on table public.admin_audit_log to service_role;
grant select on public.admin_role_directory to service_role;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;

revoke all on function public.prevent_admin_audit_mutation() from public, anon, authenticated;
revoke all on function public.require_admin_capability(text, text) from public, anon, authenticated;
revoke all on function public.admin_bootstrap_owner(text) from public, anon, authenticated;
revoke all on function public.admin_set_role(text, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_role(text, text) from public, anon, authenticated;
revoke all on function public.admin_update_room_metadata(text, text, text, text, integer, boolean, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.admin_publish_room_layout(text, text, bigint, jsonb) from public, anon, authenticated;
revoke all on function public.admin_reset_room_layout(text, text, bigint) from public, anon, authenticated;

grant execute on function public.admin_bootstrap_owner(text) to service_role;
grant execute on function public.admin_set_role(text, text, text) to service_role;
grant execute on function public.admin_delete_role(text, text) to service_role;
grant execute on function public.admin_update_room_metadata(text, text, text, text, integer, boolean, text, text, text, numeric) to service_role;
grant execute on function public.admin_publish_room_layout(text, text, bigint, jsonb) to service_role;
grant execute on function public.admin_reset_room_layout(text, text, bigint) to service_role;

commit;
