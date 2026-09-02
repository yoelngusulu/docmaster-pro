create extension if not exists pgcrypto;

do $$
beginn 
  create type public.payment_request_status as enum (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_plan as enum (
    'FREE',
    'PREMIUM'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum (
    'ACTIVE',
    'EXPIRED',
    'CANCELED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_audit_event_type as enum (
    'PAYMENT_REQUEST_SUBMITTED',
    'PAYMENT_APPROVED',
    'PAYMENT_REJECTED',
    'PAYMENT_EXPIRED',
    'PREMIUM_ACTIVATED',
    'PREMIUM_EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'PREMIUM',
  provider text not null default 'AIRTEL_MONEY',
  transaction_reference text not null,
  transaction_reference_normalized text generated always as (lower(btrim(transaction_reference))) stored,
  amount_tzs integer not null check (amount_tzs > 0),
  expected_amount_tzs integer not null check (expected_amount_tzs > 0),
  currency text not null default 'TZS',
  billing_period_months integer not null default 1 check (billing_period_months > 0),
  phone_number text not null,
  status public.payment_request_status not null default 'PENDING',
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (currency = 'TZS'),
  check (amount_tzs >= expected_amount_tzs)
);

create unique index if not exists payment_requests_provider_reference_unique
  on public.payment_requests (provider, transaction_reference_normalized);

create unique index if not exists payment_requests_one_pending_per_user_plan
  on public.payment_requests (user_id, plan)
  where status = 'PENDING';

create index if not exists payment_requests_user_status_idx
  on public.payment_requests (user_id, status, created_at desc);

create index if not exists payment_requests_status_idx
  on public.payment_requests (status, created_at desc);

drop trigger if exists set_payment_requests_updated_at on public.payment_requests;
create trigger set_payment_requests_updated_at
before update on public.payment_requests
for each row execute function public.set_updated_at();

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'PREMIUM',
  subscription_status public.subscription_status not null default 'ACTIVE',
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  activated_by_payment_id uuid references public.payment_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan = 'PREMIUM')
);

create index if not exists user_subscriptions_status_expires_idx
  on public.user_subscriptions (subscription_status, expires_at);

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.payment_audit_events (
  id bigint generated always as identity primary key,
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  admin_user_id uuid references auth.users(id) on delete set null,
  event_type public.payment_audit_event_type not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_audit_events_payment_idx
  on public.payment_audit_events (payment_request_id, created_at desc);

create index if not exists payment_audit_events_user_idx
  on public.payment_audit_events (user_id, created_at desc);

create or replace function public.prevent_payment_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'payment_audit_events is append-only';
end;
$$;

drop trigger if exists prevent_payment_audit_update on public.payment_audit_events;
create trigger prevent_payment_audit_update
before update on public.payment_audit_events
for each row execute function public.prevent_payment_audit_mutation();

drop trigger if exists prevent_payment_audit_delete on public.payment_audit_events;
create trigger prevent_payment_audit_delete
before delete on public.payment_audit_events
for each row execute function public.prevent_payment_audit_mutation();

alter table public.payment_requests enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.payment_audit_events enable row level security;

drop policy if exists "Users can read own payment requests" on public.payment_requests;
create policy "Users can read own payment requests"
  on public.payment_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own subscription" on public.user_subscriptions;
create policy "Users can read own subscription"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own payment audit events" on public.payment_audit_events;
create policy "Users can read own payment audit events"
  on public.payment_audit_events
  for select
  using (auth.uid() = user_id);
