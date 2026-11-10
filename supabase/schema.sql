-- ============================================================================
-- WitHub — esquema inicial para Supabase / PostgreSQL
-- Gerado a partir da aplicação React e dos testes de permissões existentes.
-- Execute no SQL Editor de um projeto Supabase vazio (ou após revisar conflitos).
-- Compatível com Supabase PostgreSQL 15+.
--
-- Segurança essencial:
--   * Senhas, e-mail, sessão e confirmação de e-mail ficam em Supabase Auth.
--   * Nenhuma senha/hash/salt é criada neste esquema.
--   * RLS é habilitado nas tabelas da aplicação.
--   * Publicação, mentoria, avaliação e chat usam RPCs que validam auth.uid().
--   * Arquivos de projeto ficam em buckets privados; somente avatares são públicos.
--
-- Este arquivo cria a estrutura, tabelas auxiliares, políticas, funções e buckets.
-- Ele NÃO importa as contas/dados de demonstração do localStorage.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1. Tipos e tabelas de referência
-- --------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='app_role') then
    create type public.app_role as enum ('student','mentor','viewer');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='steam_category') then
    create type public.steam_category as enum ('science','technology','engineering','arts','mathematics');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='project_visibility') then
    create type public.project_visibility as enum ('private','internal','public');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='project_stage') then
    create type public.project_stage as enum ('awaiting','mentoring','adjustments','approved','published','completed');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='mentorship_status') then
    create type public.mentorship_status as enum ('requested','accepted','active','ended','declined');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='mentorship_initiator') then
    create type public.mentorship_initiator as enum ('student','mentor');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='conversation_type') then
    create type public.conversation_type as enum ('direct','group');
  end if;
end $$;

create table if not exists public.steam_categories (
  id public.steam_category primary key,
  label text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null unique
);
insert into public.steam_categories(id,label,color_hex,sort_order) values
  ('science','Science','#0B5FFF',1),
  ('technology','Technology','#6425F0',2),
  ('engineering','Engineering','#166F45',3),
  ('arts','Arts','#B5401F',4),
  ('mathematics','Mathematics','#8A5A0A',5)
on conflict (id) do update set label=excluded.label,color_hex=excluded.color_hex,sort_order=excluded.sort_order;

create table if not exists public.institution_options (
  sort_order smallint primary key,
  name text not null unique
);
insert into public.institution_options(sort_order,name) values
  (1,'ITA — Instituto Tecnológico de Aeronáutica'),
  (2,'USP — Universidade de São Paulo'),
  (3,'UNICAMP'),
  (4,'UFMG'),
  (5,'Outra instituição')
on conflict (sort_order) do update set name=excluded.name;

-- --------------------------------------------------------------------------
-- 2. Perfis, cadastro e consentimento
-- auth.users continua sendo a fonte de identidade e e-mail.
-- legacy_id serve somente para mapear IDs antigos (ex.: u-eduardo) durante importação.
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_id text unique,
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  role public.app_role not null default 'student',
  institution text,
  course text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  position text not null check (length(btrim(position)) between 2 and 120),
  specialties text[] not null check (cardinality(specialties) between 1 and 20),
  steam_areas public.steam_category[] not null default '{}',
  bio text not null default '' check (length(bio) <= 600),
  education text not null default '' check (length(education) <= 300),
  experience text not null default '' check (length(experience) <= 600),
  links jsonb not null default '{}'::jsonb check (jsonb_typeof(links)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(steam_areas) <= 5),
  check (array_position(specialties,'') is null)
);

-- Versões canônicas dos documentos; substitua os identificadores pelos publicados antes do go-live.
create table if not exists public.legal_document_versions (
  singleton boolean primary key default true check (singleton),
  terms_version text not null check (length(btrim(terms_version)) between 1 and 40),
  privacy_version text not null check (length(btrim(privacy_version)) between 1 and 40),
  updated_at timestamptz not null default now()
);
insert into public.legal_document_versions(singleton,terms_version,privacy_version)
values(true,'terms-1','privacy-1') on conflict(singleton) do nothing;

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null check (length(btrim(terms_version)) between 1 and 40),
  privacy_version text not null check (length(btrim(privacy_version)) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (user_id,terms_version,privacy_version)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_name text;
begin
  -- Nunca confie em role enviado em user_metadata; todo cadastro começa como student.
  v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),
                     nullif(btrim(new.raw_user_meta_data->>'name'),''),
                     nullif(split_part(coalesce(new.email,''),'@',1),''),
                     'Novo usuário');
  insert into public.profiles(id,full_name,role)
  values(new.id,left(v_name,120),'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_withub on auth.users;
create trigger on_auth_user_created_withub
after insert on auth.users for each row execute function public.handle_new_auth_user();

-- Migra usuários Auth que já existiam antes da instalação desta migration.
insert into public.profiles(id,full_name,role)
select u.id,
       left(coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),
                     nullif(btrim(u.raw_user_meta_data->>'name'),''),
                     nullif(split_part(coalesce(u.email,''),'@',1),''),
                     'Usuário '||left(u.id::text,8)),120),
       'student'::public.app_role
from auth.users u
on conflict (id) do nothing;

create or replace function public.register_student(
  p_institution text,
  p_course text,
  p_terms_version text,
  p_privacy_version text
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid(); v_role public.app_role; v_current_institution text;
begin
  if v_uid is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  select role,institution into v_role,v_current_institution from public.profiles where id=v_uid for update;
  if v_role is distinct from 'student'::public.app_role then
    raise exception 'Somente contas de estudante podem concluir este cadastro.' using errcode='42501';
  end if;
  if not exists(select 1 from public.institution_options where name=btrim(coalesce(p_institution,''))) then
    raise exception 'Selecione uma instituição válida.' using errcode='22023';
  end if;
  if v_current_institution is not null and v_current_institution<>btrim(p_institution) then
    raise exception 'A instituição não pode ser alterada por este fluxo; contate a administração.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_course,''))) > 160 then raise exception 'Curso muito longo.' using errcode='22023'; end if;
  if not exists(select 1 from public.legal_document_versions
    where singleton and terms_version=btrim(coalesce(p_terms_version,''))
      and privacy_version=btrim(coalesce(p_privacy_version,''))) then
    raise exception 'A versão dos termos ou da política não é a versão ativa.' using errcode='22023';
  end if;
  update public.profiles set institution=btrim(p_institution),course=nullif(btrim(p_course),''),updated_at=now() where id=v_uid;
  insert into public.legal_consents(user_id,terms_version,privacy_version)
  values(v_uid,btrim(p_terms_version),btrim(p_privacy_version)) on conflict do nothing;
  return v_uid;
end $$;

create or replace function public.register_mentor(
  p_full_name text,
  p_institution text,
  p_position text,
  p_specialties text[],
  p_steam_areas public.steam_category[] default '{}',
  p_bio text default '',
  p_education text default '',
  p_experience text default '',
  p_links jsonb default '{}'::jsonb,
  p_terms_version text default null,
  p_privacy_version text default null
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_role public.app_role; v_link record;
begin
  if v_uid is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  select role into v_role from public.profiles where id=v_uid for update;
  if v_role not in ('student','mentor') then raise exception 'Perfil não pode ser mentor.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_full_name,''))) < 2 or length(btrim(p_full_name)) > 120 then raise exception 'Nome completo inválido.' using errcode='22023'; end if;
  if length(btrim(coalesce(p_institution,''))) < 2 or length(btrim(p_institution)) > 120 then raise exception 'Informe instituição ou empresa.' using errcode='22023'; end if;
  if length(btrim(coalesce(p_position,''))) < 2 or length(btrim(p_position)) > 120 then raise exception 'Informe cargo ou área de atuação.' using errcode='22023'; end if;
  if coalesce(cardinality(p_specialties),0) not between 1 and 20
     or exists(select 1 from unnest(coalesce(p_specialties,'{}')) as x(specialty) where length(btrim(x.specialty))=0 or length(x.specialty)>100) then
    raise exception 'Informe de 1 a 20 especialidades válidas.' using errcode='22023';
  end if;
  if cardinality(coalesce(p_steam_areas,'{}')) > 5 then raise exception 'Áreas STEAM inválidas.' using errcode='22023'; end if;
  if length(coalesce(p_bio,'')) > 600 or length(coalesce(p_education,'')) > 300 or length(coalesce(p_experience,'')) > 600 then
    raise exception 'Um dos campos do perfil excede o limite permitido.' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_links,'{}'::jsonb)) <> 'object' then raise exception 'Links inválidos.' using errcode='22023'; end if;
  for v_link in select key,value from jsonb_each_text(coalesce(p_links,'{}'::jsonb)) loop
    if v_link.key not in ('linkedin','github','portfolio') then raise exception 'Tipo de link não permitido.' using errcode='22023'; end if;
    if length(v_link.value)>200 or v_link.value !~* '^https?://[^[:space:]]+\.[^[:space:]]+' then
      raise exception 'Informe uma URL HTTP/HTTPS válida.' using errcode='22023';
    end if;
  end loop;
  if v_role='student' and not exists(select 1 from public.legal_document_versions
    where singleton and terms_version=btrim(coalesce(p_terms_version,''))
      and privacy_version=btrim(coalesce(p_privacy_version,''))) then
    raise exception 'Aceite as versões ativas dos termos e da política antes de concluir o cadastro.' using errcode='22023';
  end if;
  update public.profiles set full_name=btrim(p_full_name),institution=btrim(p_institution),role='mentor',updated_at=now() where id=v_uid;
  insert into public.mentor_profiles(user_id,position,specialties,steam_areas,bio,education,experience,links)
  values(v_uid,btrim(p_position),p_specialties,coalesce(p_steam_areas,'{}'),coalesce(p_bio,''),coalesce(p_education,''),coalesce(p_experience,''),coalesce(p_links,'{}'::jsonb))
  on conflict (user_id) do update set position=excluded.position,specialties=excluded.specialties,
    steam_areas=excluded.steam_areas,bio=excluded.bio,education=excluded.education,
    experience=excluded.experience,links=excluded.links,updated_at=now();
  if v_role='student' then
    insert into public.legal_consents(user_id,terms_version,privacy_version)
    values(v_uid,btrim(p_terms_version),btrim(p_privacy_version)) on conflict do nothing;
  end if;
  return v_uid;
end $$;

-- --------------------------------------------------------------------------
-- 3. Projetos, colaboradores, tags, mídia, arquivos e licença
-- project id é TEXT para preservar rotas/IDs legados; novos IDs são opacos.
-- --------------------------------------------------------------------------
create table if not exists public.projects (
  id text primary key default ('p-'||replace(gen_random_uuid()::text,'-','')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 240),
  description text not null check (length(btrim(description)) between 1 and 20000),
  category public.steam_category not null,
  cover_gradient text not null default 'from-[#0B5FFF] to-[#101820]',
  visibility public.project_visibility not null default 'private',
  institution text,
  stage public.project_stage,
  seeking_mentor boolean not null default false,
  publish_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  check (visibility <> 'public' or published_at is not null),
  check (visibility <> 'public' or publish_requested=false)
);

create table if not exists public.project_contributors (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  contribution text not null default '' check (length(contribution)<=500),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tags (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  tag_type text not null check (tag_type in ('skill','knowledge','technology')),
  label text not null check (length(btrim(label)) between 1 and 100),
  normalized_label text generated always as (lower(btrim(label))) stored,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique(project_id,tag_type,normalized_label)
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (length(btrim(original_name)) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 2097152),
  alt_text text not null default '' check (length(alt_text)<=300),
  sort_order smallint not null default 0 check (sort_order between 0 and 11),
  created_at timestamptz not null default now(),
  check (storage_path like project_id||'/%'),
  check (lower(original_name) ~ '\.(jpe?g|png|webp)$')
);

create table if not exists public.project_restricted_files (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (length(btrim(original_name)) between 1 and 255),
  mime_type text,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (storage_path like project_id||'/%'),
  check (lower(original_name) ~ '\.(pdf|zip|step|stp|stl|obj|dwg|dxf|f3d|png|jpg|jpeg|docx|xlsx|pptx|txt)$')
);

create table if not exists public.project_licenses (
  project_id text primary key references public.projects(id) on delete cascade,
  code text not null unique check (code ~ '^WH-[0-9]{4}-[0-9A-Z]{6}$'),
  license_type text not null default 'Licença WitHub de Portfólio Acadêmico',
  holder_name text not null,
  issued_at timestamptz not null default now(),
  status text not null default 'provisional' check (status in ('provisional','issued','revoked'))
);

create table if not exists public.project_edit_grants (
  project_id text not null references public.projects(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null default 'edit' check (permission='edit'),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(project_id,mentor_id)
);

create table if not exists public.mentorships (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  status public.mentorship_status not null default 'requested',
  initiator public.mentorship_initiator not null,
  role text not null check (role in ('Mentor responsável','Mentor colaborador')),
  invited_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.profiles(id) on delete set null,
  check ((status not in ('accepted','active','ended')) or responded_at is not null),
  check ((status <> 'active') or started_at is not null),
  check ((status <> 'ended') or ended_at is not null)
);
create unique index if not exists mentorships_one_open_link_per_pair
  on public.mentorships(project_id,mentor_id) where status in ('requested','accepted','active');

create table if not exists public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('request','offer','invite','accept','decline','start','end','note','feedback','decision','publish','reply','status','update','meeting')),
  occurred_at timestamptz not null default now(),
  summary text not null check (length(btrim(summary)) between 1 and 500),
  body text,
  visibility text not null default 'shared' check (visibility in ('shared','mentors')),
  from_stage public.project_stage,
  to_stage public.project_stage,
  check (body is null or length(body)<=5000),
  check (kind <> 'note' or visibility='mentors')
);

create table if not exists public.project_meetings (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  organizer_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  note text not null default '' check (length(note)<=500),
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_project_license()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_holder text; v_year text; v_suffix text;
begin
  select full_name into v_holder from public.profiles where id=new.owner_id;
  v_year := to_char(coalesce(new.created_at,now()) at time zone 'UTC','YYYY');
  v_suffix := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.project_licenses(project_id,code,holder_name,issued_at)
  values(new.id,'WH-'||v_year||'-'||v_suffix,coalesce(v_holder,'Estudante'),coalesce(new.created_at,now()));
  return new;
end $$;
drop trigger if exists projects_create_license on public.projects;
create trigger projects_create_license after insert on public.projects
for each row execute function public.create_project_license();

create or replace function public.enforce_project_tag_limit()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (select count(*) from public.project_tags where project_id=new.project_id and tag_type=new.tag_type and id is distinct from new.id) >= 20 then
    raise exception 'Máximo de 20 itens por tipo de tag.' using errcode='22023';
  end if;
  return new;
end $$;
drop trigger if exists project_tags_limit on public.project_tags;
create trigger project_tags_limit before insert or update on public.project_tags
for each row execute function public.enforce_project_tag_limit();

create or replace function public.enforce_project_image_limit()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (select count(*) from public.project_images where project_id=new.project_id and id is distinct from new.id) >= 12 then
    raise exception 'Máximo de 12 imagens por projeto.' using errcode='22023';
  end if;
  return new;
end $$;
drop trigger if exists project_images_limit on public.project_images;
create trigger project_images_limit before insert or update on public.project_images
for each row execute function public.enforce_project_image_limit();

-- --------------------------------------------------------------------------
-- 4. Interações sociais, notificações, conversas e mensagens
-- --------------------------------------------------------------------------
create table if not exists public.project_likes (
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create table if not exists public.project_reposts (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id,user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dedupe_key text,
  kind text not null check (kind in ('comment','repost','request','decision','feedback','status','update','meeting','message')),
  body text not null check (length(body)<=3000),
  target_path text not null default '/' check (length(target_path)<=512),
  project_id text references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create unique index if not exists notifications_one_unread_dedupe_key
  on public.notifications(user_id,dedupe_key) where read_at is null and dedupe_key is not null;
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create or replace function public.notify_user(
  p_user_id uuid,p_dedupe_key text,p_kind text,p_body text,p_target_path text,p_project_id text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then return; end if;
  if p_dedupe_key is null then
    insert into public.notifications(user_id,kind,body,target_path,project_id)
    values(p_user_id,p_kind,left(p_body,3000),left(coalesce(p_target_path,'/'),512),p_project_id);
  else
    insert into public.notifications(user_id,dedupe_key,kind,body,target_path,project_id)
    values(p_user_id,p_dedupe_key,p_kind,left(p_body,3000),left(coalesce(p_target_path,'/'),512),p_project_id)
    on conflict (user_id,dedupe_key) where read_at is null and dedupe_key is not null
    do update set kind=excluded.kind,body=excluded.body,target_path=excluded.target_path,
                  project_id=excluded.project_id,created_at=now();
  end if;
end $$;

create or replace function public.notify_project_comment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid; v_title text; v_name text;
begin
  select owner_id,title into v_owner,v_title from public.projects where id=new.project_id;
  if v_owner is not null and v_owner<>new.user_id then
    select full_name into v_name from public.profiles where id=new.user_id;
    perform public.notify_user(v_owner,'comment:'||new.id::text,'comment',
      coalesce(v_name,'Usuário')||' comentou em "'||coalesce(v_title,'um projeto')||'": '||new.body,
      '/publicacao/'||new.project_id,new.project_id);
  end if;
  return new;
end $$;
drop trigger if exists project_comments_notify_owner on public.project_comments;
create trigger project_comments_notify_owner after insert on public.project_comments
for each row execute function public.notify_project_comment();

create or replace function public.notify_project_repost()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid; v_title text; v_name text;
begin
  select owner_id,title into v_owner,v_title from public.projects where id=new.project_id;
  if v_owner is not null and v_owner<>new.user_id then
    select full_name into v_name from public.profiles where id=new.user_id;
    perform public.notify_user(v_owner,'repost:'||new.id::text,'repost',
      coalesce(v_name,'Usuário')||' repostou "'||coalesce(v_title,'um projeto')||'".',
      '/publicacao/'||new.project_id,new.project_id);
  end if;
  return new;
end $$;
drop trigger if exists project_reposts_notify_owner on public.project_reposts;
create trigger project_reposts_notify_owner after insert on public.project_reposts
for each row execute function public.notify_project_repost();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  name text not null default '' check (length(name)<=120),
  direct_user_a uuid references public.profiles(id) on delete cascade,
  direct_user_b uuid references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (type='direct' and direct_user_a is not null and direct_user_b is not null and direct_user_a<direct_user_b and name='')
    or (type='group' and direct_user_a is null and direct_user_b is null and length(btrim(name)) between 1 and 120)
  )
);
create unique index if not exists conversations_unique_direct_pair
  on public.conversations(direct_user_a,direct_user_b) where type='direct';

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default '-infinity'::timestamptz,
  primary key(conversation_id,user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('text','sticker','project')),
  body text,
  project_id text references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (kind='text' and project_id is null and length(btrim(coalesce(body,''))) between 1 and 2000)
    or (kind='sticker' and project_id is null and body is not null and body in ('👍','🎉','🚀','💡','🔧','🧠','👏','🔥','✅','🤝','📐','🧪'))
    or (kind='project' and project_id is not null and body is null)
  )
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at,id);
create unique index if not exists messages_one_project_share_per_conversation
  on public.messages(conversation_id,project_id) where kind='project' and project_id is not null;

-- --------------------------------------------------------------------------
-- 5. Funções de autorização usadas por RLS e views
-- --------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path=public,pg_temp as $$
  select p.role from public.profiles p where p.id=auth.uid()
$$;

create or replace function public.is_mentor()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(public.current_app_role()='mentor',false)
$$;

create or replace function public.is_public_mentor_profile(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles p where p.id=p_user_id and p.role='mentor')
$$;

create or replace function public.can_view_project(p_project_id text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.projects p
    left join public.profiles me on me.id=auth.uid()
    where p.id=p_project_id and p.deleted_at is null and (
      p.visibility='public'
      or p.owner_id=auth.uid()
      or (p.visibility='internal' and me.role in ('student','mentor')
          and nullif(btrim(p.institution),'') is not null
          and p.institution=me.institution)
      or exists (
        select 1 from public.mentorships m
        where m.project_id=p.id and m.mentor_id=auth.uid()
          and (m.status in ('accepted','active') or (m.status='requested' and m.initiator='student'))
      )
    )
  )
$$;

create or replace function public.can_view_restricted_project(p_project_id text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.projects p
    where p.id=p_project_id and p.deleted_at is null and (
      p.owner_id=auth.uid()
      or (public.current_app_role()='mentor' and exists (
        select 1 from public.mentorships m where m.project_id=p.id and m.mentor_id=auth.uid()
          and m.status in ('accepted','active')
      ))
    )
  )
$$;

create or replace function public.can_edit_project(p_project_id text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.projects p where p.id=p_project_id and p.deleted_at is null and public.can_view_project(p.id)
      and (p.owner_id=auth.uid() or (public.current_app_role()='mentor' and exists (
        select 1 from public.project_edit_grants g where g.project_id=p.id and g.mentor_id=auth.uid() and g.permission='edit'
      )))
  )
$$;

create or replace function public.can_read_project_history(p_project_id text,p_visibility text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.projects p where p.id=p_project_id and p.deleted_at is null and (
      (p.owner_id=auth.uid() and p_visibility='shared')
      or (public.current_app_role()='mentor' and exists (
        select 1 from public.mentorships m where m.project_id=p.id and m.mentor_id=auth.uid()
          and m.status in ('accepted','active','ended')
      ))
    )
  )
$$;

create or replace function public.can_read_project_meetings(p_project_id text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.projects p where p.id=p_project_id and p.deleted_at is null and (
      p.owner_id=auth.uid()
      or (public.current_app_role()='mentor' and exists (
        select 1 from public.mentorships m where m.project_id=p.id and m.mentor_id=auth.uid()
          and m.status in ('accepted','active','ended')
      ))
    )
  )
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=auth.uid())
$$;

-- --------------------------------------------------------------------------
-- 6. Views públicas seguras (sin e-mail, senha, hash, salt ou dados privados)
-- Views são deliberadamente curadas; RLS continua protegendo as tabelas base.
-- --------------------------------------------------------------------------
create or replace view public.mentor_directory as
select p.id,p.full_name,p.institution,p.avatar_path,
       mp.position,mp.specialties,mp.steam_areas,mp.bio,mp.education,mp.experience,mp.links
from public.profiles p join public.mentor_profiles mp on mp.user_id=p.id
where p.role='mentor';

create or replace view public.project_feed as
select p.id,p.owner_id,owner.full_name as author_name,p.title,p.description,p.category,
       p.cover_gradient,p.visibility,p.institution,p.stage,p.seeking_mentor,p.publish_requested,
       p.created_at,p.updated_at,p.published_at,
       coalesce((select array_agg(t.label order by t.sort_order,t.created_at) from public.project_tags t where t.project_id=p.id and t.tag_type='skill'),'{}'::text[]) as skills,
       coalesce((select array_agg(t.label order by t.sort_order,t.created_at) from public.project_tags t where t.project_id=p.id and t.tag_type='knowledge'),'{}'::text[]) as knowledge,
       coalesce((select array_agg(t.label order by t.sort_order,t.created_at) from public.project_tags t where t.project_id=p.id and t.tag_type='technology'),'{}'::text[]) as technologies,
       coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'storage_path',i.storage_path,'original_name',i.original_name,'mime_type',i.mime_type,'sort_order',i.sort_order) order by i.sort_order)
                 from public.project_images i where i.project_id=p.id),'[]'::jsonb) as images,
       coalesce((select count(*) from public.project_likes l where l.project_id=p.id),0)::bigint as like_count,
       coalesce((select count(*) from public.project_comments c where c.project_id=p.id),0)::bigint as comment_count,
       coalesce((select count(*) from public.project_reposts r where r.project_id=p.id),0)::bigint as repost_count,
       lic.code as license_code,lic.license_type,lic.holder_name as license_holder,lic.issued_at as license_issued_at,lic.status as license_status
from public.projects p
join public.profiles owner on owner.id=p.owner_id
left join public.project_licenses lic on lic.project_id=p.id
where p.deleted_at is null and public.can_view_project(p.id);

create or replace view public.project_comment_feed as
select c.id,c.project_id,c.user_id,p.full_name as author_name,c.body,c.created_at
from public.project_comments c join public.profiles p on p.id=c.user_id
where public.can_view_project(c.project_id);

create or replace view public.project_team as
select m.id as mentorship_id,m.project_id,m.mentor_id,p.full_name as mentor_name,p.institution,
       mp.position,mp.specialties,m.status,m.role,m.requested_at,m.started_at,m.ended_at
from public.mentorships m join public.profiles p on p.id=m.mentor_id
left join public.mentor_profiles mp on mp.user_id=m.mentor_id
where m.status in ('accepted','active','ended') and public.can_view_project(m.project_id);

create or replace view public.project_history_feed as
select h.id,h.project_id,h.author_id,p.full_name as author_name,h.kind,h.occurred_at,h.summary,h.body,
       h.visibility,h.from_stage,h.to_stage
from public.project_history h left join public.profiles p on p.id=h.author_id
where public.can_read_project_history(h.project_id,h.visibility);

create or replace view public.conversation_inbox as
select c.id,c.type,c.name,
       coalesce((select array_agg(cm.user_id order by cm.joined_at) from public.conversation_members cm where cm.conversation_id=c.id),'{}'::uuid[]) as member_ids,
       (select count(*) from public.messages msg join public.conversation_members mine on mine.conversation_id=msg.conversation_id and mine.user_id=auth.uid()
        where msg.conversation_id=c.id and msg.sender_id is distinct from auth.uid() and msg.created_at>mine.last_read_at) as unread_count,
       (select msg.created_at from public.messages msg where msg.conversation_id=c.id order by msg.created_at desc,msg.id desc limit 1) as last_message_at,
       (select msg.kind from public.messages msg where msg.conversation_id=c.id order by msg.created_at desc,msg.id desc limit 1) as last_message_kind,
       (select msg.body from public.messages msg where msg.conversation_id=c.id order by msg.created_at desc,msg.id desc limit 1) as last_message_body,
       (select msg.project_id from public.messages msg where msg.conversation_id=c.id order by msg.created_at desc,msg.id desc limit 1) as last_message_project_id
from public.conversations c
where public.is_conversation_member(c.id);

-- --------------------------------------------------------------------------
-- 7. Operações seguras de projeto e fluxo de mentoria
-- --------------------------------------------------------------------------
create or replace function public.add_project_history(
  p_project_id text,p_kind text,p_summary text,p_body text default null,
  p_visibility text default 'shared',p_from public.project_stage default null,p_to public.project_stage default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  insert into public.project_history(project_id,author_id,kind,summary,body,visibility,from_stage,to_stage)
  values(p_project_id,auth.uid(),p_kind,left(p_summary,500),p_body,p_visibility,p_from,p_to) returning id into v_id;
  update public.projects set updated_at=now() where id=p_project_id;
  return v_id;
end $$;

create or replace function public.notify_project_editor()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid; v_actor_name text; v_live record; v_other_count integer;
begin
  if pg_trigger_depth()>1 or auth.uid() is null or old.deleted_at is not null then return new; end if;
  if old.title is not distinct from new.title
     and old.description is not distinct from new.description
     and old.category is not distinct from new.category
     and old.cover_gradient is not distinct from new.cover_gradient
     and old.visibility is not distinct from new.visibility
     and old.seeking_mentor is not distinct from new.seeking_mentor then return new; end if;
  if auth.uid()<>new.owner_id and old.visibility is distinct from new.visibility and new.visibility='public' then return new; end if;
  v_owner:=new.owner_id;
  select full_name into v_actor_name from public.profiles where id=auth.uid();
  select count(*) into v_other_count from public.mentorships
    where project_id=new.id and status in ('accepted','active') and mentor_id<>auth.uid();
  if v_other_count>0 then
    perform public.add_project_history(new.id,'update',coalesce(v_actor_name,'Usuário')||' atualizou o projeto');
    for v_live in select mentor_id from public.mentorships
      where project_id=new.id and status in ('accepted','active') and mentor_id<>auth.uid() loop
      perform public.notify_user(v_live.mentor_id,'upd:'||new.id,'update',coalesce(v_actor_name,'Usuário')||' atualizou o projeto "'||new.title||'".',
        '/mentor/projetos/'||new.id,new.id);
    end loop;
  end if;
  if auth.uid()<>v_owner then
    perform public.notify_user(v_owner,'edit:'||new.id,'update',coalesce(v_actor_name,'Usuário')||' editou o projeto "'||new.title||'".',
      '/publicacao/'||new.id,new.id);
  end if;
  return new;
end $$;
drop trigger if exists projects_notify_editor on public.projects;
create trigger projects_notify_editor after update on public.projects
for each row execute function public.notify_project_editor();

create or replace function public.request_mentorship(p_project_id text,p_mentor_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project public.projects%rowtype; v_mentor_name text; v_id uuid; v_role text;
begin
  if auth.uid() is null or public.current_app_role()<>'student' then raise exception 'Somente estudante autenticado pode solicitar mentoria.' using errcode='42501'; end if;
  select * into v_project from public.projects where id=p_project_id and deleted_at is null for update;
  if not found or v_project.owner_id<>auth.uid() then raise exception 'Somente o responsável pelo projeto pode solicitar mentoria.' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=p_mentor_id and role='mentor') then raise exception 'Mentor inválido.' using errcode='22023'; end if;
  if exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=p_mentor_id and status in ('requested','accepted','active')) then
    raise exception 'Já existe uma solicitação ou vínculo ativo deste mentor.' using errcode='23505';
  end if;
  v_role := case when exists(select 1 from public.mentorships where project_id=p_project_id and status in ('accepted','active')) then 'Mentor colaborador' else 'Mentor responsável' end;
  insert into public.mentorships(project_id,mentor_id,status,initiator,role)
  values(p_project_id,p_mentor_id,'requested','student',v_role) returning id into v_id;
  if v_project.stage is null or v_project.stage='completed' then update public.projects set stage='awaiting' where id=p_project_id; end if;
  select full_name into v_mentor_name from public.profiles where id=p_mentor_id;
  perform public.add_project_history(p_project_id,'request','Solicitou mentoria a '||coalesce(v_mentor_name,'mentor'));
  perform public.notify_user(p_mentor_id,'mreq:'||v_id::text,'request',
    (select full_name from public.profiles where id=auth.uid())||' solicitou sua mentoria no projeto "'||v_project.title||'".',
    '/mentor/projetos/'||p_project_id,p_project_id);
  return v_id;
end $$;

create or replace function public.create_project(
  p_title text,p_description text,p_category public.steam_category,
  p_desired_visibility public.project_visibility default 'private',p_seeking_mentor boolean default false,
  p_skills text[] default '{}',p_knowledge text[] default '{}',p_technologies text[] default '{}',p_mentor_id uuid default null
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id text; v_institution text; v_tags record; v_arr text[];
begin
  if auth.uid() is null or public.current_app_role()<>'student' then raise exception 'Somente estudantes podem criar projetos.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_title,''))) not between 1 and 240 then raise exception 'Título obrigatório ou muito longo.' using errcode='22023'; end if;
  if length(btrim(coalesce(p_description,''))) not between 1 and 20000 then raise exception 'Descrição obrigatória ou muito longa.' using errcode='22023'; end if;
  if p_desired_visibility='public' and p_mentor_id is null then raise exception 'Para solicitar publicação pública, selecione um mentor.' using errcode='22023'; end if;
  if coalesce(cardinality(p_skills),0)>20 or coalesce(cardinality(p_knowledge),0)>20 or coalesce(cardinality(p_technologies),0)>20 then
    raise exception 'Máximo de 20 tags por tipo.' using errcode='22023';
  end if;
  select institution into v_institution from public.profiles where id=auth.uid();
  insert into public.projects(owner_id,title,description,category,visibility,institution,stage,seeking_mentor,publish_requested)
  values(auth.uid(),btrim(p_title),btrim(p_description),p_category,
         case when p_desired_visibility='public' then 'private'::public.project_visibility else p_desired_visibility end,
         v_institution,null,p_seeking_mentor,(p_desired_visibility='public')) returning id into v_id;
  for v_tags in select 'skill'::text as tag_type,p_skills as vals union all
                select 'knowledge',p_knowledge union all select 'technology',p_technologies loop
    v_arr := coalesce(v_tags.vals,'{}'::text[]);
    insert into public.project_tags(project_id,tag_type,label,sort_order)
    select v_id,v_tags.tag_type,btrim(x.label),x.ord::smallint
    from unnest(v_arr) with ordinality as x(label,ord)
    where length(btrim(x.label)) between 1 and 100
    on conflict(project_id,tag_type,normalized_label) do nothing;
  end loop;
  if p_mentor_id is not null then perform public.request_mentorship(v_id,p_mentor_id); end if;
  return v_id;
end $$;

create or replace function public.set_project_visibility(p_project_id text,p_visibility public.project_visibility)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or public.current_app_role()<>'student' then raise exception 'Somente o estudante responsável pode alterar a visibilidade.' using errcode='42501'; end if;
  if p_visibility='public' then raise exception 'Somente um mentor ativo pode publicar um projeto aprovado.' using errcode='42501'; end if;
  update public.projects set visibility=p_visibility,publish_requested=false
  where id=p_project_id and owner_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Projeto não encontrado ou sem permissão.' using errcode='42501'; end if;
end $$;

create or replace function public.set_project_seeking_mentor(p_project_id text,p_seeking_mentor boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or public.current_app_role()<>'student' then raise exception 'Somente o estudante responsável pode alterar esta opção.' using errcode='42501'; end if;
  update public.projects set seeking_mentor=p_seeking_mentor
  where id=p_project_id and owner_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Projeto não encontrado ou sem permissão.' using errcode='42501'; end if;
end $$;

create or replace function public.soft_delete_project(p_project_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.projects set deleted_at=now() where id=p_project_id and owner_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Projeto não encontrado ou sem permissão.' using errcode='42501'; end if;
end $$;

create or replace function public.set_project_edit_grant(p_project_id text,p_mentor_id uuid,p_allowed boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.projects where id=p_project_id and owner_id=auth.uid() and deleted_at is null) then
    raise exception 'Somente o responsável pode gerenciar permissões.' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_mentor_id and role='mentor') then raise exception 'A permissão só pode ser delegada a mentores.' using errcode='22023'; end if;
  if p_allowed then
    insert into public.project_edit_grants(project_id,mentor_id,granted_by) values(p_project_id,p_mentor_id,auth.uid())
    on conflict(project_id,mentor_id) do update set granted_by=excluded.granted_by,created_at=now();
  else
    delete from public.project_edit_grants where project_id=p_project_id and mentor_id=p_mentor_id;
  end if;
end $$;

create or replace function public.offer_mentorship(p_project_id text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project public.projects%rowtype; v_id uuid;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  select * into v_project from public.projects where id=p_project_id and deleted_at is null;
  if not found or not public.can_view_project(p_project_id) then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  if v_project.owner_id=auth.uid() then raise exception 'Não é possível oferecer mentoria ao próprio projeto.' using errcode='22023'; end if;
  if exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status in ('requested','accepted','active')) then raise exception 'Já existe uma solicitação ou mentoria.' using errcode='23505'; end if;
  insert into public.mentorships(project_id,mentor_id,status,initiator,role)
  values(p_project_id,auth.uid(),'requested','mentor',case when exists(select 1 from public.mentorships where project_id=p_project_id and status in ('accepted','active')) then 'Mentor colaborador' else 'Mentor responsável' end)
  returning id into v_id;
  perform public.add_project_history(p_project_id,'offer',(select full_name from public.profiles where id=auth.uid())||' ofereceu mentoria');
  perform public.notify_user(v_project.owner_id,'moff:'||v_id::text,'request',
    (select full_name from public.profiles where id=auth.uid())||' ofereceu mentoria para o projeto "'||v_project.title||'". Aceite ou recuse na página do projeto.',
    '/publicacao/'||p_project_id,p_project_id);
  return v_id;
end $$;

create or replace function public.invite_mentor(p_project_id text,p_mentor_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project public.projects%rowtype; v_id uuid; v_target text; v_actor text;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  if p_mentor_id=auth.uid() or not exists(select 1 from public.profiles where id=p_mentor_id and role='mentor') then raise exception 'Selecione outro mentor válido.' using errcode='22023'; end if;
  if not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status='active') then raise exception 'É necessário acompanhar ativamente o projeto.' using errcode='42501'; end if;
  select * into v_project from public.projects where id=p_project_id and deleted_at is null;
  if not found or not public.can_view_project(p_project_id) then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  if not exists(select 1 from public.profiles where id=v_project.owner_id and role='student') then raise exception 'O projeto não tem estudante cadastrado para autorizar o convite.' using errcode='22023'; end if;
  if exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=p_mentor_id and status in ('requested','accepted','active')) then raise exception 'Já existe vínculo ou convite.' using errcode='23505'; end if;
  select full_name into v_target from public.profiles where id=p_mentor_id;
  select full_name into v_actor from public.profiles where id=auth.uid();
  insert into public.mentorships(project_id,mentor_id,status,initiator,role,invited_by)
  values(p_project_id,p_mentor_id,'requested','mentor','Mentor colaborador',auth.uid()) returning id into v_id;
  perform public.add_project_history(p_project_id,'invite',v_actor||' convidou '||coalesce(v_target,'um mentor')||' para colaborar');
  perform public.notify_user(v_project.owner_id,'minv:'||v_id::text,'request',v_actor||' convidou '||coalesce(v_target,'um mentor')||' para colaborar no projeto "'||v_project.title||'". Autorize ou recuse.',
    '/publicacao/'||p_project_id,p_project_id);
  perform public.notify_user(p_mentor_id,'minvd:'||v_id::text,'request',v_actor||' convidou você para colaborar em um projeto. O convite aguarda autorização do estudante.',
    '/mentor',null);
  return v_id;
end $$;

create or replace function public.respond_mentorship(p_mentorship_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_m public.mentorships%rowtype; v_p public.projects%rowtype; v_by_mentor boolean; v_actor text; v_target text; v_status public.mentorship_status;
begin
  select * into v_m from public.mentorships where id=p_mentorship_id for update;
  if not found then raise exception 'Mentoria não encontrada.' using errcode='P0002'; end if;
  select * into v_p from public.projects where id=v_m.project_id and deleted_at is null for update;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  if v_m.status<>'requested' then raise exception 'Esta solicitação já foi respondida.' using errcode='40001'; end if;
  v_by_mentor := v_m.initiator='student' and v_m.mentor_id=auth.uid() and public.is_mentor();
  if not v_by_mentor and not (v_m.initiator='mentor' and v_p.owner_id=auth.uid() and public.current_app_role()='student') then
    raise exception 'Você não pode responder a esta solicitação.' using errcode='42501';
  end if;
  v_status := case when p_accept then 'accepted'::public.mentorship_status else 'declined'::public.mentorship_status end;
  update public.mentorships set status=v_status,responded_at=now(),accepted_at=case when p_accept then now() else null end where id=p_mentorship_id;
  if p_accept and (v_p.stage is null or v_p.stage='completed') then update public.projects set stage='awaiting' where id=v_p.id; end if;
  select full_name into v_actor from public.profiles where id=auth.uid();
  select full_name into v_target from public.profiles where id=v_m.mentor_id;
  perform public.add_project_history(v_p.id,case when p_accept then 'accept' else 'decline' end,
    case when v_by_mentor then v_actor||case when p_accept then ' aceitou a solicitação de mentoria' else ' recusou a solicitação de mentoria' end
    else v_actor||case when p_accept then ' autorizou a mentoria de ' else ' recusou a mentoria de ' end||coalesce(v_target,'mentor') end);
  if v_by_mentor then
    perform public.notify_user(v_p.owner_id,'mresp:'||v_m.id::text,'request',v_actor||case when p_accept then ' aceitou' else ' recusou' end||' sua solicitação de mentoria em "'||v_p.title||'".',
      '/publicacao/'||v_p.id,v_p.id);
  else
    perform public.notify_user(v_m.mentor_id,'mresp:'||v_m.id::text,'request',v_actor||case when p_accept then ' autorizou' else ' recusou' end||' a mentoria do projeto.',
      case when p_accept then '/mentor/projetos/'||v_p.id else '/mentor' end,case when p_accept then v_p.id else null end);
    if v_m.invited_by is not null then
      perform public.notify_user(v_m.invited_by,'mresp:'||v_m.id::text,'request',v_actor||case when p_accept then ' autorizou' else ' recusou' end||' o convite de mentoria.',
        '/mentor/projetos/'||v_p.id,case when p_accept then v_p.id else null end);
    end if;
  end if;
end $$;

create or replace function public.start_mentorship(p_mentorship_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_m public.mentorships%rowtype; v_p public.projects%rowtype; v_name text;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  select * into v_m from public.mentorships where id=p_mentorship_id for update;
  if not found then raise exception 'Mentoria não encontrada.' using errcode='P0002'; end if;
  if v_m.mentor_id<>auth.uid() then raise exception 'Você não pode iniciar a mentoria de outro mentor.' using errcode='42501'; end if;
  if v_m.status<>'accepted' then raise exception 'Aceite a solicitação antes de iniciar.' using errcode='40001'; end if;
  select * into v_p from public.projects where id=v_m.project_id and deleted_at is null for update;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  update public.mentorships set status='active',started_at=now() where id=v_m.id;
  if v_p.stage is null or v_p.stage='awaiting' then update public.projects set stage='mentoring' where id=v_p.id; end if;
  select full_name into v_name from public.profiles where id=auth.uid();
  perform public.add_project_history(v_p.id,'start',v_name||' iniciou o acompanhamento');
  perform public.notify_user(v_p.owner_id,'mstart:'||v_m.id::text,'status',v_name||' iniciou o acompanhamento do projeto "'||v_p.title||'".',
    '/publicacao/'||v_p.id,v_p.id);
end $$;

create or replace function public.end_mentorship(p_mentorship_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_m public.mentorships%rowtype; v_p public.projects%rowtype; v_name text; v_as_mentor boolean;
begin
  select * into v_m from public.mentorships where id=p_mentorship_id for update;
  if not found then raise exception 'Mentoria não encontrada.' using errcode='P0002'; end if;
  select * into v_p from public.projects where id=v_m.project_id and deleted_at is null for update;
  v_as_mentor := v_m.mentor_id=auth.uid() and public.is_mentor();
  if not v_as_mentor and not (v_p.owner_id=auth.uid() and public.current_app_role()='student') then raise exception 'Você não pode encerrar esta mentoria.' using errcode='42501'; end if;
  if v_m.status not in ('accepted','active') then raise exception 'Esta mentoria não está em andamento.' using errcode='40001'; end if;
  update public.mentorships set status='ended',ended_at=now(),ended_by=auth.uid() where id=v_m.id;
  if not exists(select 1 from public.mentorships where project_id=v_p.id and status in ('accepted','active')) then
    update public.projects set stage='completed' where id=v_p.id;
  end if;
  select full_name into v_name from public.profiles where id=auth.uid();
  perform public.add_project_history(v_p.id,'end',v_name||' encerrou a mentoria de '||(select full_name from public.profiles where id=v_m.mentor_id));
  if v_as_mentor then
    perform public.notify_user(v_p.owner_id,'mend:'||v_m.id::text,'status',v_name||' encerrou o acompanhamento do projeto "'||v_p.title||'".','/publicacao/'||v_p.id,v_p.id);
  else
    perform public.notify_user(v_m.mentor_id,'mend:'||v_m.id::text,'status',v_name||' encerrou a mentoria do projeto.','/mentor',null);
  end if;
end $$;

create or replace function public.add_project_private_note(p_project_id text,p_text text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_mentor() or not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status in ('accepted','active')) then
    raise exception 'É necessário estar vinculado ao projeto para registrar orientação privada.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_text,''))) not between 1 and 2000 then raise exception 'Orientação inválida.' using errcode='22023'; end if;
  v_id := public.add_project_history(p_project_id,'note',(select full_name from public.profiles where id=auth.uid())||' registrou uma orientação privada',btrim(p_text),'mentors');
  return v_id;
end $$;

create or replace function public.send_project_feedback(p_project_id text,p_text text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_owner uuid; v_title text; v_name text;
begin
  if not public.is_mentor() or not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status='active') then
    raise exception 'É necessário acompanhar ativamente este projeto.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_text,''))) not between 1 and 2000 then raise exception 'Feedback inválido.' using errcode='22023'; end if;
  select owner_id,title into v_owner,v_title from public.projects where id=p_project_id and deleted_at is null;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  select full_name into v_name from public.profiles where id=auth.uid();
  v_id := public.add_project_history(p_project_id,'feedback',v_name||' enviou um feedback',btrim(p_text));
  perform public.notify_user(v_owner,'fb:'||v_id::text,'feedback',v_name||' enviou um feedback sobre "'||v_title||'".','/publicacao/'||p_project_id,p_project_id);
  return v_id;
end $$;

create or replace function public.evaluate_project(p_project_id text,p_decision text,p_justification text default '')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.projects%rowtype; v_from public.project_stage; v_to public.project_stage; v_id uuid; v_name text; v_message text;
begin
  if not public.is_mentor() or not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status='active') then
    raise exception 'É necessário acompanhar ativamente este projeto.' using errcode='42501';
  end if;
  select * into v_p from public.projects where id=p_project_id and deleted_at is null for update;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  if p_decision='approve' then
    if v_p.stage not in ('awaiting','mentoring') then raise exception 'Etapa não permite aprovação.' using errcode='40001'; end if;
    v_to:='approved';
  elsif p_decision='adjustments' then
    if v_p.stage not in ('awaiting','mentoring','approved') then raise exception 'Etapa não permite solicitar ajustes.' using errcode='40001'; end if;
    if length(btrim(coalesce(p_justification,'')))<5 then raise exception 'Justifique os ajustes (mínimo de 5 caracteres).' using errcode='22023'; end if;
    v_to:='adjustments';
  else raise exception 'Decisão inválida.' using errcode='22023'; end if;
  v_from:=v_p.stage;
  update public.projects set stage=v_to where id=p_project_id;
  select full_name into v_name from public.profiles where id=auth.uid();
  v_id:=public.add_project_history(p_project_id,'decision',v_name||case when p_decision='approve' then ' aprovou o projeto' else ' solicitou ajustes' end,
    nullif(btrim(coalesce(p_justification,'')),''),'shared',v_from,v_to);
  v_message:=case when p_decision='approve' then v_name||' aprovou "'||v_p.title||'". A publicação continua sob controle do mentor.'
                  else v_name||' solicitou ajustes em "'||v_p.title||'": '||left(btrim(p_justification),140) end;
  perform public.notify_user(v_p.owner_id,'dec:'||v_id::text,'decision',v_message,'/publicacao/'||p_project_id,p_project_id);
  return v_id;
end $$;

create or replace function public.publish_project(p_project_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.projects%rowtype; v_name text; v_event uuid;
begin
  if not public.is_mentor() or not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status='active') then
    raise exception 'É necessário acompanhar ativamente este projeto.' using errcode='42501';
  end if;
  select * into v_p from public.projects where id=p_project_id and deleted_at is null for update;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  if v_p.visibility='public' then raise exception 'Este projeto já está publicado.' using errcode='40001'; end if;
  if v_p.stage<>'approved' then raise exception 'Aprove o projeto antes da publicação.' using errcode='40001'; end if;
  update public.projects set visibility='public',publish_requested=false,published_at=now() where id=p_project_id;
  select full_name into v_name from public.profiles where id=auth.uid();
  v_event:=public.add_project_history(p_project_id,'publish',v_name||' publicou o projeto no feed','', 'shared','approved','published');
  perform public.notify_user(v_p.owner_id,'pub:'||v_event::text,'decision',v_name||' publicou "'||v_p.title||'" no feed da comunidade.','/publicacao/'||p_project_id,p_project_id);
end $$;

create or replace function public.reply_to_project_feedback(p_project_id text,p_text text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.projects%rowtype; v_id uuid; v_m record; v_name text;
begin
  if public.current_app_role()<>'student' then raise exception 'Somente estudante pode responder.' using errcode='42501'; end if;
  select * into v_p from public.projects where id=p_project_id and owner_id=auth.uid() and deleted_at is null;
  if not found then raise exception 'Somente o responsável pode responder.' using errcode='42501'; end if;
  if not exists(select 1 from public.mentorships where project_id=p_project_id and status in ('accepted','active')) then raise exception 'Não há mentoria em andamento.' using errcode='40001'; end if;
  if length(btrim(coalesce(p_text,''))) not between 1 and 2000 then raise exception 'Resposta inválida.' using errcode='22023'; end if;
  select full_name into v_name from public.profiles where id=auth.uid();
  v_id:=public.add_project_history(p_project_id,'reply',v_name||' respondeu ao acompanhamento',btrim(p_text));
  for v_m in select mentor_id from public.mentorships where project_id=p_project_id and status in ('accepted','active') loop
    perform public.notify_user(v_m.mentor_id,'rep:'||p_project_id,'feedback',v_name||' respondeu ao feedback em "'||v_p.title||'".','/mentor/projetos/'||p_project_id,p_project_id);
  end loop;
  return v_id;
end $$;

create or replace function public.resubmit_project(p_project_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.projects%rowtype; v_name text; v_event uuid; v_m record;
begin
  if public.current_app_role()<>'student' then raise exception 'Somente estudante pode reenviar.' using errcode='42501'; end if;
  select * into v_p from public.projects where id=p_project_id and owner_id=auth.uid() and deleted_at is null for update;
  if not found then raise exception 'Somente o responsável pode reenviar.' using errcode='42501'; end if;
  if v_p.stage<>'adjustments' then raise exception 'Só é possível reenviar projetos que aguardam ajustes.' using errcode='40001'; end if;
  update public.projects set stage='awaiting' where id=p_project_id;
  select full_name into v_name from public.profiles where id=auth.uid();
  v_event:=public.add_project_history(p_project_id,'status',v_name||' reenviou o projeto para avaliação',null,'shared','adjustments','awaiting');
  for v_m in select mentor_id from public.mentorships where project_id=p_project_id and status in ('accepted','active') loop
    perform public.notify_user(v_m.mentor_id,'resub:'||v_event::text,'status',v_name||' reenviou "'||v_p.title||'" para avaliação.','/mentor/projetos/'||p_project_id,p_project_id);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 8. Agenda de mentoria
-- --------------------------------------------------------------------------
create or replace function public.schedule_project_meeting(p_project_id text,p_starts_at timestamptz,p_note text default '')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_p public.projects%rowtype; v_id uuid; v_name text; v_m record; v_msg text;
begin
  if not public.is_mentor() or not exists(select 1 from public.mentorships where project_id=p_project_id and mentor_id=auth.uid() and status='active') then
    raise exception 'É necessário acompanhar ativamente este projeto.' using errcode='42501';
  end if;
  if p_starts_at is null or p_starts_at<now()-interval '1 minute' then raise exception 'Informe uma data futura.' using errcode='22023'; end if;
  if length(coalesce(p_note,''))>500 then raise exception 'A pauta deve ter até 500 caracteres.' using errcode='22023'; end if;
  select * into v_p from public.projects where id=p_project_id and deleted_at is null;
  if not found then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  insert into public.project_meetings(project_id,organizer_id,starts_at,note) values(p_project_id,auth.uid(),p_starts_at,coalesce(btrim(p_note),'')) returning id into v_id;
  select full_name into v_name from public.profiles where id=auth.uid();
  perform public.add_project_history(p_project_id,'meeting',v_name||' agendou um encontro de mentoria',to_char(p_starts_at at time zone 'UTC','YYYY-MM-DD HH24:MI')||' UTC');
  v_msg:=v_name||' agendou um encontro de mentoria para o projeto "'||v_p.title||'".';
  perform public.notify_user(v_p.owner_id,'mtg:'||v_id::text,'meeting',v_msg,'/publicacao/'||p_project_id,p_project_id);
  for v_m in select mentor_id from public.mentorships where project_id=p_project_id and status in ('accepted','active') and mentor_id<>auth.uid() loop
    perform public.notify_user(v_m.mentor_id,'mtg:'||v_id::text,'meeting',v_msg,'/mentor/projetos/'||p_project_id,p_project_id);
  end loop;
  return v_id;
end $$;

create or replace function public.set_project_meeting_status(p_meeting_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_mt public.project_meetings%rowtype;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  if p_status not in ('done','cancelled') then raise exception 'Situação inválida.' using errcode='22023'; end if;
  select * into v_mt from public.project_meetings where id=p_meeting_id for update;
  if not found then raise exception 'Encontro não encontrado.' using errcode='P0002'; end if;
  if not exists(select 1 from public.mentorships where project_id=v_mt.project_id and mentor_id=auth.uid() and status='active') then raise exception 'É necessário acompanhar ativamente este projeto.' using errcode='42501'; end if;
  if v_mt.status<>'scheduled' then raise exception 'Este encontro já foi encerrado.' using errcode='40001'; end if;
  update public.project_meetings set status=p_status,updated_at=now() where id=p_meeting_id;
  update public.projects set updated_at=now() where id=v_mt.project_id;
end $$;

-- --------------------------------------------------------------------------
-- 9. Chat exclusivo para mentores
-- --------------------------------------------------------------------------
create or replace function public.create_conversation(p_type public.conversation_type,p_name text default '',p_member_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ids uuid[]; v_id uuid; v_a uuid; v_b uuid; v_member uuid; v_name text;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  select array_agg(distinct u.id order by u.id) into v_ids
  from unnest(array_append(coalesce(p_member_ids,'{}'::uuid[]),auth.uid())) as u(id) where u.id is not null;
  if exists(select 1 from unnest(v_ids) as u(id) where not exists(select 1 from public.profiles p where p.id=u.id and p.role='mentor')) then
    raise exception 'Somente mentores podem participar do chat.' using errcode='42501';
  end if;
  if p_type='direct' then
    if cardinality(v_ids)<>2 then raise exception 'Conversa individual exige exatamente outro mentor.' using errcode='22023'; end if;
    v_a:=least(v_ids[1],v_ids[2]); v_b:=greatest(v_ids[1],v_ids[2]);
    select id into v_id from public.conversations where type='direct' and direct_user_a=v_a and direct_user_b=v_b;
    if v_id is not null then return v_id; end if;
    begin
      insert into public.conversations(type,name,direct_user_a,direct_user_b,created_by)
      values('direct','',v_a,v_b,auth.uid()) returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.conversations where type='direct' and direct_user_a=v_a and direct_user_b=v_b;
      return v_id;
    end;
  else
    if cardinality(v_ids)<3 then raise exception 'Um grupo precisa de pelo menos dois outros mentores.' using errcode='22023'; end if;
    if length(btrim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'Dê um nome válido ao grupo.' using errcode='22023'; end if;
    insert into public.conversations(type,name,created_by) values('group',btrim(p_name),auth.uid()) returning id into v_id;
  end if;
  foreach v_member in array v_ids loop
    insert into public.conversation_members(conversation_id,user_id,added_by) values(v_id,v_member,auth.uid());
    if v_member<>auth.uid() then
      select full_name into v_name from public.profiles where id=auth.uid();
      perform public.notify_user(v_member,'conv:'||v_id::text,'message',
        case when p_type='group' then v_name||' adicionou você ao grupo "'||btrim(p_name)||'".' else v_name||' iniciou uma conversa com você.' end,
        '/mentor/chat/'||v_id::text,null);
    end if;
  end loop;
  return v_id;
end $$;

create or replace function public.start_direct_chat(p_mentor_id uuid,p_project_id text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_count integer;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  if p_mentor_id=auth.uid() or not exists(select 1 from public.profiles where id=p_mentor_id and role='mentor') then raise exception 'Escolha outro mentor.' using errcode='22023'; end if;
  if p_project_id is not null and not public.can_view_project(p_project_id) then raise exception 'Projeto não encontrado.' using errcode='P0002'; end if;
  v_id:=public.create_conversation('direct','',array[p_mentor_id]);
  if p_project_id is not null then
    insert into public.messages(conversation_id,sender_id,kind,project_id)
    values(v_id,auth.uid(),'project',p_project_id) on conflict(conversation_id,project_id) where kind='project' and project_id is not null do nothing;
    get diagnostics v_count=row_count;
    if v_count>0 then
      update public.conversation_members set last_read_at=now() where conversation_id=v_id and user_id=auth.uid();
      perform public.notify_user(p_mentor_id,'msg:'||v_id::text,'message',
        (select full_name from public.profiles where id=auth.uid())||' compartilhou um projeto na conversa.',
        '/mentor/chat/'||v_id::text,null);
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.send_chat_message(p_conversation_id uuid,p_kind text,p_body text default null,p_project_id text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_member record; v_name text; v_conversation public.conversations%rowtype;
begin
  if not public.is_mentor() then raise exception 'Área exclusiva para mentores.' using errcode='42501'; end if;
  if not public.is_conversation_member(p_conversation_id) then raise exception 'Você não participa desta conversa.' using errcode='42501'; end if;
  select * into v_conversation from public.conversations where id=p_conversation_id;
  if p_kind='text' then
    if length(btrim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Mensagem vazia ou muito longa.' using errcode='22023'; end if;
    insert into public.messages(conversation_id,sender_id,kind,body) values(p_conversation_id,auth.uid(),'text',btrim(p_body)) returning id into v_id;
  elsif p_kind='sticker' then
    if p_body not in ('👍','🎉','🚀','💡','🔧','🧠','👏','🔥','✅','🤝','📐','🧪') then raise exception 'Figurinha inválida.' using errcode='22023'; end if;
    insert into public.messages(conversation_id,sender_id,kind,body) values(p_conversation_id,auth.uid(),'sticker',p_body) returning id into v_id;
  elsif p_kind='project' then
    if p_project_id is null or not public.can_view_project(p_project_id) then raise exception 'Projeto não visível.' using errcode='42501'; end if;
    insert into public.messages(conversation_id,sender_id,kind,project_id) values(p_conversation_id,auth.uid(),'project',p_project_id) returning id into v_id;
  else raise exception 'Tipo de mensagem inválido.' using errcode='22023'; end if;
  update public.conversation_members set last_read_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
  select full_name into v_name from public.profiles where id=auth.uid();
  for v_member in select user_id from public.conversation_members where conversation_id=p_conversation_id and user_id<>auth.uid() loop
    perform public.notify_user(v_member.user_id,'msg:'||p_conversation_id::text,'message',v_name||' enviou uma mensagem'||case when v_conversation.type='group' then ' em "'||v_conversation.name||'"' else '' end||'.',
      '/mentor/chat/'||p_conversation_id::text,null);
  end loop;
  return v_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_mentor() or not public.is_conversation_member(p_conversation_id) then raise exception 'Você não participa desta conversa.' using errcode='42501'; end if;
  update public.conversation_members set last_read_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
  update public.notifications set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and dedupe_key='msg:'||p_conversation_id::text and read_at is null;
end $$;

create or replace function public.mark_notifications_read(p_notification_ids uuid[])
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
  update public.notifications set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and id=any(coalesce(p_notification_ids,'{}'::uuid[])) and read_at is null;
  get diagnostics v_count=row_count;
  return v_count;
end $$;

-- --------------------------------------------------------------------------
-- 10. RLS: ligar em todas as tabelas e criar políticas por domínio
-- --------------------------------------------------------------------------
alter table public.steam_categories enable row level security;
alter table public.institution_options enable row level security;
alter table public.profiles enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.legal_consents enable row level security;
alter table public.projects enable row level security;
alter table public.project_contributors enable row level security;
alter table public.project_tags enable row level security;
alter table public.project_images enable row level security;
alter table public.project_restricted_files enable row level security;
alter table public.project_licenses enable row level security;
alter table public.project_edit_grants enable row level security;
alter table public.mentorships enable row level security;
alter table public.project_history enable row level security;
alter table public.project_meetings enable row level security;
alter table public.project_likes enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_reposts enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Lookups
 drop policy if exists steam_categories_read on public.steam_categories;
create policy steam_categories_read on public.steam_categories for select to anon,authenticated using (true);
drop policy if exists institution_options_read on public.institution_options;
create policy institution_options_read on public.institution_options for select to anon,authenticated using (true);
drop policy if exists legal_document_versions_read on public.legal_document_versions;
create policy legal_document_versions_read on public.legal_document_versions for select to anon,authenticated using (singleton);

-- Perfis: usuário só acessa o próprio registro; role e instituição não são editáveis diretamente.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists mentor_profiles_read_public on public.mentor_profiles;
create policy mentor_profiles_read_public on public.mentor_profiles
  for select to anon,authenticated using (user_id=auth.uid() or public.is_public_mentor_profile(user_id));
drop policy if exists mentor_profiles_update_self on public.mentor_profiles;
create policy mentor_profiles_update_self on public.mentor_profiles
  for update to authenticated using (user_id=auth.uid() and public.current_app_role()='mentor')
  with check (user_id=auth.uid() and public.current_app_role()='mentor');

drop policy if exists legal_consents_read_self on public.legal_consents;
create policy legal_consents_read_self on public.legal_consents for select to authenticated using (user_id=auth.uid());

drop policy if exists projects_read_visible on public.projects;
create policy projects_read_visible on public.projects for select to anon,authenticated using (public.can_view_project(id));
drop policy if exists projects_update_editors on public.projects;
create policy projects_update_editors on public.projects for update to authenticated
  using (public.can_edit_project(id)) with check (public.can_edit_project(id));

drop policy if exists project_contributors_read_visible on public.project_contributors;
create policy project_contributors_read_visible on public.project_contributors for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_contributors_insert_owner on public.project_contributors;
create policy project_contributors_insert_owner on public.project_contributors for insert to authenticated
  with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists project_contributors_update_owner on public.project_contributors;
create policy project_contributors_update_owner on public.project_contributors for update to authenticated
  using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null))
  with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists project_contributors_delete_owner on public.project_contributors;
create policy project_contributors_delete_owner on public.project_contributors for delete to authenticated
  using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));

drop policy if exists project_tags_read_visible on public.project_tags;
create policy project_tags_read_visible on public.project_tags for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_tags_insert_owner on public.project_tags;
create policy project_tags_insert_owner on public.project_tags for insert to authenticated
  with check (public.can_edit_project(project_id));
drop policy if exists project_tags_update_owner on public.project_tags;
create policy project_tags_update_owner on public.project_tags for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists project_tags_delete_owner on public.project_tags;
create policy project_tags_delete_owner on public.project_tags for delete to authenticated
  using (public.can_edit_project(project_id));

drop policy if exists project_images_read_visible on public.project_images;
create policy project_images_read_visible on public.project_images for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_images_insert_owner on public.project_images;
create policy project_images_insert_owner on public.project_images for insert to authenticated
  with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null)
              and storage_path like project_id||'/%');
drop policy if exists project_images_update_owner on public.project_images;
create policy project_images_update_owner on public.project_images for update to authenticated
  using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null))
  with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null)
              and storage_path like project_id||'/%');
drop policy if exists project_images_delete_owner on public.project_images;
create policy project_images_delete_owner on public.project_images for delete to authenticated
  using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));

drop policy if exists restricted_files_read_authorized on public.project_restricted_files;
create policy restricted_files_read_authorized on public.project_restricted_files for select to authenticated using (public.can_view_restricted_project(project_id));
drop policy if exists restricted_files_insert_owner on public.project_restricted_files;
create policy restricted_files_insert_owner on public.project_restricted_files for insert to authenticated
  with check (uploaded_by=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null)
              and storage_path like project_id||'/%');
drop policy if exists restricted_files_delete_owner on public.project_restricted_files;
create policy restricted_files_delete_owner on public.project_restricted_files for delete to authenticated
  using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid() and p.deleted_at is null));

drop policy if exists project_licenses_read_visible on public.project_licenses;
create policy project_licenses_read_visible on public.project_licenses for select to anon,authenticated using (public.can_view_project(project_id));

drop policy if exists project_edit_grants_read_involved on public.project_edit_grants;
create policy project_edit_grants_read_involved on public.project_edit_grants for select to authenticated
  using (mentor_id=auth.uid() or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=auth.uid()));

create or replace function public.can_read_mentorship(p_mentorship_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.mentorships m join public.projects p on p.id=m.project_id
    where m.id=p_mentorship_id and p.deleted_at is null
      and (m.mentor_id=auth.uid() or m.invited_by=auth.uid() or p.owner_id=auth.uid()))
$$;
drop policy if exists mentorships_read_involved on public.mentorships;
create policy mentorships_read_involved on public.mentorships for select to authenticated using (public.can_read_mentorship(id));

drop policy if exists project_history_read_authorized on public.project_history;
create policy project_history_read_authorized on public.project_history for select to authenticated
  using (public.can_read_project_history(project_id,visibility));

drop policy if exists project_meetings_read_authorized on public.project_meetings;
create policy project_meetings_read_authorized on public.project_meetings for select to authenticated
  using (public.can_read_project_meetings(project_id));

drop policy if exists project_likes_read_visible on public.project_likes;
create policy project_likes_read_visible on public.project_likes for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_likes_insert_self on public.project_likes;
create policy project_likes_insert_self on public.project_likes for insert to authenticated
  with check (user_id=auth.uid() and public.can_view_project(project_id));
drop policy if exists project_likes_delete_self on public.project_likes;
create policy project_likes_delete_self on public.project_likes for delete to authenticated using (user_id=auth.uid());

drop policy if exists project_comments_read_visible on public.project_comments;
create policy project_comments_read_visible on public.project_comments for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_comments_insert_self on public.project_comments;
create policy project_comments_insert_self on public.project_comments for insert to authenticated
  with check (user_id=auth.uid() and public.can_view_project(project_id));

drop policy if exists project_reposts_read_visible on public.project_reposts;
create policy project_reposts_read_visible on public.project_reposts for select to anon,authenticated using (public.can_view_project(project_id));
drop policy if exists project_reposts_insert_self_public on public.project_reposts;
create policy project_reposts_insert_self_public on public.project_reposts for insert to authenticated
  with check (user_id=auth.uid() and exists(select 1 from public.projects p where p.id=project_id and p.visibility='public' and p.deleted_at is null and p.owner_id<>auth.uid()));
drop policy if exists project_reposts_delete_self on public.project_reposts;
create policy project_reposts_delete_self on public.project_reposts for delete to authenticated using (user_id=auth.uid());

drop policy if exists notifications_read_self on public.notifications;
create policy notifications_read_self on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists notifications_update_read_self on public.notifications;
create policy notifications_update_read_self on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists conversations_read_member on public.conversations;
create policy conversations_read_member on public.conversations for select to authenticated
  using (public.is_mentor() and public.is_conversation_member(id));
drop policy if exists conversation_members_read_member on public.conversation_members;
create policy conversation_members_read_member on public.conversation_members for select to authenticated
  using (public.is_mentor() and public.is_conversation_member(conversation_id));
drop policy if exists conversation_members_update_own_read on public.conversation_members;
create policy conversation_members_update_own_read on public.conversation_members for update to authenticated
  using (user_id=auth.uid() and public.is_mentor() and public.is_conversation_member(conversation_id))
  with check (user_id=auth.uid() and public.is_mentor());
drop policy if exists messages_read_member on public.messages;
create policy messages_read_member on public.messages for select to authenticated
  using (public.is_mentor() and public.is_conversation_member(conversation_id));

-- --------------------------------------------------------------------------
-- 11. Grants mínimos; RLS continua decidindo linha a linha
-- --------------------------------------------------------------------------
grant usage on schema public to anon,authenticated;
grant select on public.steam_categories,public.institution_options to anon,authenticated;
grant select on public.legal_document_versions to anon,authenticated;
grant select on public.profiles to authenticated;
grant update(full_name,course,avatar_path) on public.profiles to authenticated;
grant select on public.mentor_profiles to anon,authenticated;
grant select on public.legal_consents to authenticated;
grant select on public.projects to anon,authenticated;
grant update(title,description,category,cover_gradient) on public.projects to authenticated;
grant select,insert,update,delete on public.project_contributors to authenticated;
grant select,insert,update,delete on public.project_tags to authenticated;
grant select,insert,update,delete on public.project_images to authenticated;
grant select,insert,delete on public.project_restricted_files to authenticated;
grant select on public.project_licenses to anon,authenticated;
grant select on public.project_edit_grants,public.mentorships,public.project_history,public.project_meetings to authenticated;
grant select,insert,delete on public.project_likes to authenticated;
grant select on public.project_likes to anon;
grant select,insert on public.project_comments to authenticated;
grant select on public.project_comments to anon;
grant select,insert,delete on public.project_reposts to authenticated;
grant select on public.project_reposts to anon;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select on public.conversations,public.conversation_members,public.messages to authenticated;
grant select on public.mentor_directory,public.project_feed,public.project_comment_feed,public.project_team,public.project_history_feed to anon,authenticated;
grant select on public.conversation_inbox to authenticated;

-- Remover EXECUTE padrão de PUBLIC/anon das funções próprias; permitir somente
-- helpers de autorização (necessários a RLS/views) e RPCs a usuários autenticados.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as signature,p.proname
           from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname=any(array[
             'touch_updated_at','handle_new_auth_user','register_student','register_mentor','create_project_license',
             'enforce_project_tag_limit','enforce_project_image_limit','notify_user','notify_project_comment','notify_project_repost',
             'notify_project_editor','current_app_role','is_mentor','is_public_mentor_profile','can_view_project','can_view_restricted_project','can_edit_project',
             'can_read_project_history','can_read_project_meetings','is_conversation_member','can_read_mentorship',
             'add_project_history','request_mentorship','create_project','set_project_visibility','set_project_seeking_mentor','soft_delete_project',
             'set_project_edit_grant','offer_mentorship','invite_mentor','respond_mentorship','start_mentorship','end_mentorship',
             'add_project_private_note','send_project_feedback','evaluate_project','publish_project',
             'reply_to_project_feedback','resubmit_project','schedule_project_meeting','set_project_meeting_status',
             'create_conversation','start_direct_chat','send_chat_message','mark_conversation_read','mark_notifications_read'
           ]) loop
    execute format('revoke all on function %s from public',r.signature);
    execute format('revoke all on function %s from anon',r.signature);
  end loop;
end $$;

grant execute on function public.current_app_role(),public.is_mentor() to anon,authenticated;
grant execute on function public.is_public_mentor_profile(uuid),public.can_view_project(text),public.can_view_restricted_project(text),public.can_edit_project(text),
  public.can_read_project_history(text,text),public.can_read_project_meetings(text),public.is_conversation_member(uuid),
  public.can_read_mentorship(uuid) to anon,authenticated;
grant execute on function public.register_student(text,text,text,text),public.register_mentor(text,text,text,text[],public.steam_category[],text,text,text,jsonb,text,text),
  public.create_project(text,text,public.steam_category,public.project_visibility,boolean,text[],text[],text[],uuid),
  public.request_mentorship(text,uuid),public.offer_mentorship(text),public.invite_mentor(text,uuid),
  public.respond_mentorship(uuid,boolean),public.start_mentorship(uuid),public.end_mentorship(uuid),
  public.add_project_private_note(text,text),public.send_project_feedback(text,text),public.evaluate_project(text,text,text),
  public.publish_project(text),public.reply_to_project_feedback(text,text),public.resubmit_project(text),
  public.set_project_visibility(text,public.project_visibility),public.set_project_seeking_mentor(text,boolean),public.soft_delete_project(text),
  public.set_project_edit_grant(text,uuid,boolean),public.schedule_project_meeting(text,timestamptz,text),
  public.set_project_meeting_status(uuid,text),public.create_conversation(public.conversation_type,text,uuid[]),
  public.start_direct_chat(uuid,text),public.send_chat_message(uuid,text,text,text),
  public.mark_conversation_read(uuid),public.mark_notifications_read(uuid[]) to authenticated;

-- Triggers de updated_at para tabelas que possuem essa coluna.
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists mentor_profiles_touch_updated_at on public.mentor_profiles;
create trigger mentor_profiles_touch_updated_at before update on public.mentor_profiles for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists project_meetings_touch_updated_at on public.project_meetings;
create trigger project_meetings_touch_updated_at before update on public.project_meetings for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------------
-- 12. Supabase Storage: avatares públicos; imagens e anexos restritos privados
-- Os caminhos devem iniciar com o ID do projeto (projetos) ou UUID do usuário.
-- --------------------------------------------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('withub-avatars','withub-avatars',true,307200,array['image/jpeg','image/png','image/webp']),
  ('withub-project-media','withub-project-media',false,2097152,array['image/jpeg','image/png','image/webp']),
  ('withub-project-files','withub-project-files',false,10485760,null)
on conflict (id) do update set name=excluded.name,public=excluded.public,
  file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Fotos de perfil são públicas por design; o usuário só pode enviar/remover as próprias.
drop policy if exists withub_avatars_public_read on storage.objects;
create policy withub_avatars_public_read on storage.objects for select to anon,authenticated
  using (bucket_id='withub-avatars');
drop policy if exists withub_avatars_insert_self on storage.objects;
create policy withub_avatars_insert_self on storage.objects for insert to authenticated
  with check (bucket_id='withub-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists withub_avatars_update_self on storage.objects;
create policy withub_avatars_update_self on storage.objects for update to authenticated
  using (bucket_id='withub-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='withub-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists withub_avatars_delete_self on storage.objects;
create policy withub_avatars_delete_self on storage.objects for delete to authenticated
  using (bucket_id='withub-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- Imagens: acesso de leitura segue a visibilidade do projeto; upload/delete somente owner.
drop policy if exists withub_project_media_read on storage.objects;
create policy withub_project_media_read on storage.objects for select to anon,authenticated
  using (bucket_id='withub-project-media' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and public.can_view_project(p.id)));
drop policy if exists withub_project_media_insert_owner on storage.objects;
create policy withub_project_media_insert_owner on storage.objects for insert to authenticated
  with check (bucket_id='withub-project-media' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists withub_project_media_update_owner on storage.objects;
create policy withub_project_media_update_owner on storage.objects for update to authenticated
  using (bucket_id='withub-project-media' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null))
  with check (bucket_id='withub-project-media' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists withub_project_media_delete_owner on storage.objects;
create policy withub_project_media_delete_owner on storage.objects for delete to authenticated
  using (bucket_id='withub-project-media' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));

-- Arquivos confidenciais: somente owner e mentor accepted/active têm leitura.
drop policy if exists withub_project_files_read_authorized on storage.objects;
create policy withub_project_files_read_authorized on storage.objects for select to authenticated
  using (bucket_id='withub-project-files' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and public.can_view_restricted_project(p.id)));
drop policy if exists withub_project_files_insert_owner on storage.objects;
create policy withub_project_files_insert_owner on storage.objects for insert to authenticated
  with check (bucket_id='withub-project-files' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists withub_project_files_update_owner on storage.objects;
create policy withub_project_files_update_owner on storage.objects for update to authenticated
  using (bucket_id='withub-project-files' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null))
  with check (bucket_id='withub-project-files' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));
drop policy if exists withub_project_files_delete_owner on storage.objects;
create policy withub_project_files_delete_owner on storage.objects for delete to authenticated
  using (bucket_id='withub-project-files' and exists(
    select 1 from public.projects p where p.id=(storage.foldername(name))[1] and p.owner_id=auth.uid() and p.deleted_at is null));

commit;

-- Fim da instalação inicial do banco do WitHub.
