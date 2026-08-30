create or replace function public.approve_premium_payment_request(
  payment_id uuid,
  admin_user_id uuid,
  verification_note text default null
)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.payment_requests%rowtype;
  subscription_record public.user_subscriptions%rowtype;
  activation_time timestamptz := now();
  expiry_time timestamptz;
begin
  select * into request_record
  from public.payment_requests
  where id = payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if request_record.user_id = admin_user_id then
    raise exception 'SELF_APPROVAL_BLOCKED';
  end if;

  if request_record.status <> 'PENDING' then
    raise exception 'PAYMENT_NOT_PENDING';
  end if;

  if request_record.expires_at <= activation_time then
    update public.payment_requests
    set
      status = 'EXPIRED',
      reviewed_at = activation_time,
      reviewed_by = admin_user_id,
      admin_note = nullif(btrim(verification_note), '')
    where id = payment_id;

    insert into public.payment_audit_events (
      payment_request_id,
      user_id,
      admin_user_id,
      event_type,
      details
    ) values (
      request_record.id,
      request_record.user_id,
      admin_user_id,
      'PAYMENT_EXPIRED',
      jsonb_build_object('expiresAt', request_record.expires_at)
    );

    raise exception 'PAYMENT_EXPIRED';
  end if;

  if request_record.amount_tzs < request_record.expected_amount_tzs then
    raise exception 'PAYMENT_AMOUNT_TOO_LOW';
  end if;

  expiry_time := activation_time + make_interval(months => request_record.billing_period_months);

  update public.payment_requests
  set
    status = 'APPROVED',
    reviewed_at = activation_time,
    reviewed_by = admin_user_id,
    admin_note = nullif(btrim(verification_note), '')
  where id = payment_id;

  insert into public.payment_audit_events (
    payment_request_id,
    user_id,
    admin_user_id,
    event_type,
    details
  ) values (
    request_record.id,
    request_record.user_id,
    admin_user_id,
    'PAYMENT_APPROVED',
    jsonb_build_object(
      'amountTzs', request_record.amount_tzs,
      'expectedAmountTzs', request_record.expected_amount_tzs
    )
  );

  insert into public.user_subscriptions (
    user_id,
    plan,
    subscription_status,
    activated_at,
    expires_at,
    activated_by_payment_id
  ) values (
    request_record.user_id,
    'PREMIUM',
    'ACTIVE',
    activation_time,
    expiry_time,
    request_record.id
  )
  on conflict (user_id) do update
  set
    plan = excluded.plan,
    subscription_status = excluded.subscription_status,
    activated_at = excluded.activated_at,
    expires_at = excluded.expires_at,
    activated_by_payment_id = excluded.activated_by_payment_id
  returning * into subscription_record;

  insert into public.payment_audit_events (
    payment_request_id,
    user_id,
    admin_user_id,
    event_type,
    details
  ) values (
    request_record.id,
    request_record.user_id,
    admin_user_id,
    'PREMIUM_ACTIVATED',
    jsonb_build_object(
      'activatedAt', activation_time,
      'expiresAt', expiry_time,
      'billingPeriodMonths', request_record.billing_period_months
    )
  );

  return subscription_record;
end;
$$;

create or replace function public.reject_premium_payment_request(
  payment_id uuid,
  admin_user_id uuid,
  verification_note text default null
)
returns public.payment_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.payment_requests%rowtype;
  rejected_record public.payment_requests%rowtype;
  rejection_time timestamptz := now();
begin
  select * into request_record
  from public.payment_requests
  where id = payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if request_record.user_id = admin_user_id then
    raise exception 'SELF_APPROVAL_BLOCKED';
  end if;

  if request_record.status <> 'PENDING' then
    raise exception 'PAYMENT_NOT_PENDING';
  end if;

  update public.payment_requests
  set
    status = 'REJECTED',
    reviewed_at = rejection_time,
    reviewed_by = admin_user_id,
    admin_note = nullif(btrim(verification_note), '')
  where id = payment_id
  returning * into rejected_record;

  insert into public.payment_audit_events (
    payment_request_id,
    user_id,
    admin_user_id,
    event_type,
    details
  ) values (
    request_record.id,
    request_record.user_id,
    admin_user_id,
    'PAYMENT_REJECTED',
    jsonb_build_object(
      'amountTzs', request_record.amount_tzs,
      'expectedAmountTzs', request_record.expected_amount_tzs,
      'noteProvided', nullif(btrim(verification_note), '') is not null
    )
  );

  return rejected_record;
end;
$$;

revoke all on function public.approve_premium_payment_request(uuid, uuid, text) from public;
revoke all on function public.reject_premium_payment_request(uuid, uuid, text) from public;

grant execute on function public.approve_premium_payment_request(uuid, uuid, text) to service_role;
grant execute on function public.reject_premium_payment_request(uuid, uuid, text) to service_role;
