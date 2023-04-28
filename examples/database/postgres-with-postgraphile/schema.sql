create extension "uuid-ossp";

create table public.user (
  id uuid primary key,
  email text not null
);

create table session (
  id uuid primary key,
  user_id uuid not null references public.user
);

create type task_status as enum (
  'TODO',
  'IN_PROGRESS',
  'DONE'
);

create table task (
  id uuid primary key,
  created_by_user_id uuid not null references public.user,
  private boolean not null default false,
  assignee_user_id uuid not null references public.user,
  status task_status not null,
  title text not null,
  description text not null
);
