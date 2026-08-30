# DocMaster Premium Manual Payment Setup

DocMaster Premium uses a manual Airtel Money verification flow. Users submit payment details, but Premium access is activated only after an authorized admin approves the payment.

## 1. Run Supabase migrations

Run these SQL files in order:

1. `supabase/migrations/202608300700_premium_payment_flow.sql`
2. `supabase/migrations/202608300710_premium_payment_admin_functions.sql`

They create:

- `payment_requests`
- `user_subscriptions`
- `payment_audit_events`
- server-side approve/reject functions
- RLS read policies for user-owned billing records
- unique transaction reference protection
- one pending Premium request per user

## 2. Add server environment variables

Set these in `.env.local` for development and in the production host environment:

```env
DOCMASTER_PREMIUM_PRICE_TZS=2000
DOCMASTER_PREMIUM_BILLING_MONTHS=1
DOCMASTER_PAYMENT_REQUEST_EXPIRY_HOURS=48
DOCMASTER_PAYMENT_REFERENCE_PREFIX=DOCMASTER
DOCMASTER_AIRTEL_LIPA_NAMBA=your_airtel_lipa_namba
DOCMASTER_ADMIN_EMAILS=admin@example.com
```

Do not commit `.env.local` or real Airtel details to GitHub.

## 3. Admin access

An admin is authorized when either:

- their email is listed in `DOCMASTER_ADMIN_EMAILS`, or
- their Supabase Auth `app_metadata.role` is `admin`, or
- their Supabase Auth `app_metadata.is_admin` is `true`.

Do not use `user_metadata` for admin authorization.

## 4. Test checklist

1. Open `/pricing` and confirm Premium shows `Upgrade to Premium` only after payment env vars are configured.
2. Open `/checkout/premium` while logged out and confirm it redirects to login.
3. Log in and submit one valid payment request.
4. Submit the same transaction ID again and confirm it is blocked.
5. Submit a second pending request for the same user and confirm it is blocked.
6. Visit `/admin/payments` as a non-admin and confirm access is denied.
7. Visit `/admin/payments` as an admin and approve a pending payment.
8. Confirm dashboard shows Premium active and an expiry date.
9. Confirm a limited tool gives Premium unlimited access server-side.
10. Reject another pending payment and confirm Premium is not activated.
