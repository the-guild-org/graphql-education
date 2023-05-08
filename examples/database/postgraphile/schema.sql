create extension "uuid-ossp";
create extension pg_trgm;

--

create role anon_user;
create role auth_user;

--

create table public.user (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  password text not null
);
grant all on public.user to anon_user, auth_user;

comment on column public.user.password is '@omit';

--

create table session (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user
);
comment on table session is '@omit';

create index session_user_id_idx on session (user_id);

--

create type task_status as enum (
  'TODO',
  'IN_PROGRESS',
  'DONE'
);

create table task (
  id uuid primary key default uuid_generate_v4(),
  created_by_id uuid not null references public.user,
  private boolean not null default false,
  assignee_id uuid references public.user,
  status task_status not null,
  title text not null,
  description text
);
grant all on task to anon_user, auth_user;

create index task_title_idx on task using gin (title gin_trgm_ops);

create function filter_tasks(
  search_text text
) returns setof task as $$
  select * from task
  where search_text is null
  or (
    title ilike '%' || search_text || '%'
  )
$$ language sql stable;

--

create function notify_task_created()
returns trigger as $$
begin
  perform pg_notify('task_created', new.id::text);
  return null;
end
$$ language plpgsql stable;
create trigger task_created_trigger
  after insert on task
  for each row
  execute procedure notify_task_created();

-- create trigger task_changed_trigger
--   after update on task
--   for each row
--   execute procedure ?;
