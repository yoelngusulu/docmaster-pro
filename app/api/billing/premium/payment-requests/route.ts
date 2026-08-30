import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  formatTzs,
  getPremiumPlanConfig,
} from "@/lib/billing/config";
import { maskPhoneNumber } from "@/lib/billing/format";
import {
  expirePendingPaymentRequests,
  isBillingSchemaMissingError,
  normalizePaymentReference,
  normalizePhoneNumber,
  PaymentRequestRow,
  writePaymentAuditEvent,
} from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/[\s,]/g, "");

  if (!text) {
    return null;
  }

  const amount = Number(text);

  return Number.isFinite(amount) ? Math.round(amount) : null;
}

function validatePaymentReference(value: string) {
  if (value.length < 5) {
    return "Enter a valid Airtel transaction ID.";
  }

  if (value.length > 80) {
    return "Transaction ID is too long.";
  }

  if (!/^[A-Z0-9._-]+$/.test(value)) {
    return "Transaction ID can contain only letters, numbers, dots, underscores or hyphens.";
  }

  return null;
}

function validatePhoneNumber(value: string) {
  if (value.length < 9 || value.length > 16) {
    return "Enter the phone number used for payment.";
  }

  if (!/^\+?[0-9]+$/.test(value)) {
    return "Phone number can contain digits and an optional plus sign only.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Please log in before upgrading to Premium.",
      },
      {
        status: 401,
      }
    );
  }

  const premiumPlan = getPremiumPlanConfig();

  if (!premiumPlan.checkoutConfigured) {
    return NextResponse.json(
      {
        error:
          "Premium checkout is not configured yet. Please contact DocMaster support.",
      },
      {
        status: 503,
      }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      {
        error: "Invalid payment details.",
      },
      {
        status: 400,
      }
    );
  }

  const transactionReference = normalizePaymentReference(
    String(body.transactionReference ?? "")
  );
  const phoneNumber = normalizePhoneNumber(
    String(body.phoneNumber ?? "")
  );
  const amountPaid = parseAmount(body.amountPaid);

  const referenceError = validatePaymentReference(
    transactionReference
  );

  if (referenceError) {
    return NextResponse.json(
      {
        error: referenceError,
      },
      {
        status: 400,
      }
    );
  }

  const phoneError = validatePhoneNumber(phoneNumber);

  if (phoneError) {
    return NextResponse.json(
      {
        error: phoneError,
      },
      {
        status: 400,
      }
    );
  }

  if (amountPaid === null) {
    return NextResponse.json(
      {
        error: "Enter the amount you paid in TZS.",
      },
      {
        status: 400,
      }
    );
  }

  if (amountPaid < premiumPlan.amountTzs) {
    return NextResponse.json(
      {
        error: `Premium costs ${formatTzs(
          premiumPlan.amountTzs
        )}. The submitted amount is below the official price.`,
      },
      {
        status: 400,
      }
    );
  }

  await expirePendingPaymentRequests(user.id);

  const admin = createAdminClient();

  const { data: pendingPayment, error: pendingError } =
    await admin
      .from("payment_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .eq("plan", "PREMIUM")
      .eq("status", "PENDING")
      .maybeSingle();

  if (pendingError) {
    if (isBillingSchemaMissingError(pendingError)) {
      return NextResponse.json(
        {
          error:
            "Billing database tables are not ready yet. Run the Premium payment migration first.",
        },
        {
          status: 500,
        }
      );
    }

    throw pendingError;
  }

  if (pendingPayment) {
    return NextResponse.json(
      {
        error:
          "You already have a Premium payment waiting for verification.",
      },
      {
        status: 409,
      }
    );
  }

  const { data: existingReference, error: referenceLookupError } =
    await admin
      .from("payment_requests")
      .select("id, status")
      .eq("provider", "AIRTEL_MONEY")
      .eq(
        "transaction_reference_normalized",
        transactionReference.toLowerCase()
      )
      .maybeSingle();

  if (referenceLookupError) {
    if (isBillingSchemaMissingError(referenceLookupError)) {
      return NextResponse.json(
        {
          error:
            "Billing database tables are not ready yet. Run the Premium payment migration first.",
        },
        {
          status: 500,
        }
      );
    }

    throw referenceLookupError;
  }

  if (existingReference) {
    return NextResponse.json(
      {
        error:
          "This Airtel transaction ID has already been submitted.",
      },
      {
        status: 409,
      }
    );
  }

  const expiresAt = new Date(
    Date.now() +
      premiumPlan.requestExpiryHours * 60 * 60 * 1000
  ).toISOString();

  const { data: paymentRequest, error: insertError } =
    await admin
      .from("payment_requests")
      .insert({
        user_id: user.id,
        plan: "PREMIUM",
        provider: "AIRTEL_MONEY",
        transaction_reference: transactionReference,
        amount_tzs: amountPaid,
        expected_amount_tzs: premiumPlan.amountTzs,
        currency: "TZS",
        billing_period_months:
          premiumPlan.billingPeriodMonths,
        phone_number: phoneNumber,
        status: "PENDING",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "This payment request already exists. Please wait for verification or contact support.",
        },
        {
          status: 409,
        }
      );
    }

    if (isBillingSchemaMissingError(insertError)) {
      return NextResponse.json(
        {
          error:
            "Billing database tables are not ready yet. Run the Premium payment migration first.",
        },
        {
          status: 500,
        }
      );
    }

    throw insertError;
  }

  const typedPayment = paymentRequest as PaymentRequestRow;

  await writePaymentAuditEvent({
    paymentRequestId: typedPayment.id,
    userId: user.id,
    eventType: "PAYMENT_REQUEST_SUBMITTED",
    details: {
      provider: typedPayment.provider,
      amountTzs: typedPayment.amount_tzs,
      expectedAmountTzs: typedPayment.expected_amount_tzs,
      billingPeriodMonths:
        typedPayment.billing_period_months,
    },
  });

  return NextResponse.json({
    message: "Payment submitted for verification",
    payment: {
      id: typedPayment.id,
      status: typedPayment.status,
      amountTzs: typedPayment.amount_tzs,
      expectedAmountTzs: typedPayment.expected_amount_tzs,
      phoneNumberMasked: maskPhoneNumber(
        typedPayment.phone_number
      ),
      expiresAt: typedPayment.expires_at,
    },
  });
}
