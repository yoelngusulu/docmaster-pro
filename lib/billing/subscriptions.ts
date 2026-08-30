import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export type SubscriptionPlan = "FREE" | "PREMIUM";

export type UserSubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED"
  | "NONE";

export type PaymentAuditEventType =
  | "PAYMENT_REQUEST_SUBMITTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "PAYMENT_EXPIRED"
  | "PREMIUM_ACTIVATED"
  | "PREMIUM_EXPIRED";

export type PaymentRequestRow = {
  id: string;
  user_id: string;
  plan: "PREMIUM";
  provider: string;
  transaction_reference: string;
  amount_tzs: number;
  expected_amount_tzs: number;
  currency: "TZS";
  billing_period_months: number;
  phone_number: string;
  status: PaymentStatus;
  submitted_at: string;
  expires_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSubscriptionRow = {
  user_id: string;
  plan: "PREMIUM";
  subscription_status: Exclude<UserSubscriptionStatus, "NONE">;
  activated_at: string;
  expires_at: string;
  activated_by_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingSummary = {
  plan: SubscriptionPlan;
  subscriptionStatus: UserSubscriptionStatus;
  activatedAt: string | null;
  expiresAt: string | null;
  activatedByPaymentId: string | null;
  pendingPayment: PaymentRequestRow | null;
  latestPayment: PaymentRequestRow | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function getBillingAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error(
      "Unable to create billing admin client:",
      error
    );
    return null;
  }
}

export function isBillingSchemaMissingError(error: unknown) {
  const typedError = error as SupabaseErrorLike | null;
  const message = typedError?.message || "";

  return (
    typedError?.code === "42P01" ||
    message.includes("payment_requests") ||
    message.includes("user_subscriptions") ||
    message.includes("payment_audit_events") ||
    message.toLowerCase().includes("schema cache") ||
    message.toLowerCase().includes("does not exist")
  );
}

export function normalizePaymentReference(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[^0-9+]/g, "");
}

export function maskPhoneNumber(value: string) {
  const clean = normalizePhoneNumber(value);

  if (clean.length <= 6) {
    return clean.replace(/.(?=.{2})/g, "*");
  }

  return `${clean.slice(0, 4)}${"*".repeat(
    Math.max(clean.length - 7, 3)
  )}${clean.slice(-3)}`;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export async function writePaymentAuditEvent({
  paymentRequestId,
  userId,
  adminUserId,
  eventType,
  details = {},
}: {
  paymentRequestId?: string | null;
  userId: string;
  adminUserId?: string | null;
  eventType: PaymentAuditEventType;
  details?: Record<string, unknown>;
}) {
  const admin = getBillingAdminClient();

  if (!admin) {
    return;
  }

  const { error } = await admin
    .from("payment_audit_events")
    .insert({
      payment_request_id: paymentRequestId || null,
      user_id: userId,
      admin_user_id: adminUserId || null,
      event_type: eventType,
      details,
    });

  if (error && !isBillingSchemaMissingError(error)) {
    console.error(
      "Unable to write payment audit event:",
      error
    );
  }
}

export async function expirePendingPaymentRequests(userId?: string) {
  const admin = getBillingAdminClient();

  if (!admin) {
    return;
  }

  let query = admin
    .from("payment_requests")
    .select("id, user_id, status, expires_at")
    .eq("status", "PENDING")
    .lt("expires_at", new Date().toISOString());

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    if (!isBillingSchemaMissingError(error)) {
      console.error(
        "Unable to find expired payment requests:",
        error
      );
    }

    return;
  }

  const expiredRequests =
    (data as Pick<
      PaymentRequestRow,
      "id" | "user_id" | "status" | "expires_at"
    >[] | null) ?? [];

  if (expiredRequests.length === 0) {
    return;
  }

  const ids = expiredRequests.map((request) => request.id);

  const { error: updateError } = await admin
    .from("payment_requests")
    .update({ status: "EXPIRED" })
    .in("id", ids)
    .eq("status", "PENDING");

  if (updateError) {
    if (!isBillingSchemaMissingError(updateError)) {
      console.error(
        "Unable to expire payment requests:",
        updateError
      );
    }

    return;
  }

  await Promise.all(
    expiredRequests.map((request) =>
      writePaymentAuditEvent({
        paymentRequestId: request.id,
        userId: request.user_id,
        eventType: "PAYMENT_EXPIRED",
        details: {
          expiredAt: new Date().toISOString(),
        },
      })
    )
  );
}

async function expireSubscription(
  subscription: UserSubscriptionRow
) {
  const admin = getBillingAdminClient();

  if (!admin) {
    return;
  }

  const { error } = await admin
    .from("user_subscriptions")
    .update({ subscription_status: "EXPIRED" })
    .eq("user_id", subscription.user_id)
    .eq("subscription_status", "ACTIVE");

  if (error) {
    if (!isBillingSchemaMissingError(error)) {
      console.error(
        "Unable to expire premium subscription:",
        error
      );
    }

    return;
  }

  await writePaymentAuditEvent({
    paymentRequestId: subscription.activated_by_payment_id,
    userId: subscription.user_id,
    eventType: "PREMIUM_EXPIRED",
    details: {
      expiresAt: subscription.expires_at,
    },
  });
}

export async function getActivePremiumSubscription(userId: string) {
  const admin = getBillingAdminClient();

  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("user_subscriptions")
    .select(
      "user_id, plan, subscription_status, activated_at, expires_at, activated_by_payment_id, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("plan", "PREMIUM")
    .maybeSingle();

  if (error) {
    if (!isBillingSchemaMissingError(error)) {
      console.error(
        "Unable to load premium subscription:",
        error
      );
    }

    return null;
  }

  const subscription = data as UserSubscriptionRow | null;

  if (!subscription) {
    return null;
  }

  if (subscription.subscription_status !== "ACTIVE") {
    return null;
  }

  if (new Date(subscription.expires_at).getTime() <= Date.now()) {
    await expireSubscription(subscription);
    return null;
  }

  return subscription;
}

export async function getUserBillingSummary(
  userId: string
): Promise<BillingSummary> {
  await expirePendingPaymentRequests(userId);

  const activeSubscription =
    await getActivePremiumSubscription(userId);

  const admin = getBillingAdminClient();

  if (!admin) {
    return {
      plan: activeSubscription ? "PREMIUM" : "FREE",
      subscriptionStatus: activeSubscription
        ? "ACTIVE"
        : "NONE",
      activatedAt: activeSubscription?.activated_at ?? null,
      expiresAt: activeSubscription?.expires_at ?? null,
      activatedByPaymentId:
        activeSubscription?.activated_by_payment_id ?? null,
      pendingPayment: null,
      latestPayment: null,
    };
  }

  const { data, error } = await admin
    .from("payment_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (error) {
    if (!isBillingSchemaMissingError(error)) {
      console.error(
        "Unable to load user billing summary:",
        error
      );
    }

    return {
      plan: activeSubscription ? "PREMIUM" : "FREE",
      subscriptionStatus: activeSubscription
        ? "ACTIVE"
        : "NONE",
      activatedAt: activeSubscription?.activated_at ?? null,
      expiresAt: activeSubscription?.expires_at ?? null,
      activatedByPaymentId:
        activeSubscription?.activated_by_payment_id ?? null,
      pendingPayment: null,
      latestPayment: null,
    };
  }

  const payments = (data as PaymentRequestRow[] | null) ?? [];

  return {
    plan: activeSubscription ? "PREMIUM" : "FREE",
    subscriptionStatus: activeSubscription ? "ACTIVE" : "NONE",
    activatedAt: activeSubscription?.activated_at ?? null,
    expiresAt: activeSubscription?.expires_at ?? null,
    activatedByPaymentId:
      activeSubscription?.activated_by_payment_id ?? null,
    pendingPayment:
      payments.find((payment) => payment.status === "PENDING") ??
      null,
    latestPayment: payments[0] ?? null,
  };
}

export async function activatePremiumSubscription({
  userId,
  paymentRequestId,
  billingPeriodMonths,
  adminUserId,
}: {
  userId: string;
  paymentRequestId: string;
  billingPeriodMonths: number;
  adminUserId: string;
}) {
  const admin = getBillingAdminClient();

  if (!admin) {
    throw new Error("Billing admin client is not configured.");
  }

  const activatedAt = new Date();
  const expiresAt = addMonths(activatedAt, billingPeriodMonths);

  const { data, error } = await admin
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "PREMIUM",
        subscription_status: "ACTIVE",
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        activated_by_payment_id: paymentRequestId,
      },
      {
        onConflict: "user_id",
      }
    )
    .select(
      "user_id, plan, subscription_status, activated_at, expires_at, activated_by_payment_id, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  await writePaymentAuditEvent({
    paymentRequestId,
    userId,
    adminUserId,
    eventType: "PREMIUM_ACTIVATED",
    details: {
      activatedAt: activatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      billingPeriodMonths,
    },
  });

  return data as UserSubscriptionRow;
}
