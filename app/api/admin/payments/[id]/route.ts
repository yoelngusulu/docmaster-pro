import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  expirePendingPaymentRequests,
  isBillingSchemaMissingError,
} from "@/lib/billing/subscriptions";
import { requireAdmin } from "@/lib/admin/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SupabaseErrorLike = {
  message?: string;
};

function paymentErrorResponse(error: unknown) {
  const message =
    (error as SupabaseErrorLike | null)?.message || "";

  if (isBillingSchemaMissingError(error)) {
    return NextResponse.json(
      {
        error:
          "Billing database tables are not ready yet. Run the Premium payment migrations first.",
      },
      {
        status: 500,
      }
    );
  }

  if (message.includes("PAYMENT_NOT_FOUND")) {
    return NextResponse.json(
      {
        error: "Payment request was not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (message.includes("SELF_APPROVAL_BLOCKED")) {
    return NextResponse.json(
      {
        error:
          "Admins cannot verify their own Premium payment request.",
      },
      {
        status: 403,
      }
    );
  }

  if (message.includes("PAYMENT_NOT_PENDING")) {
    return NextResponse.json(
      {
        error:
          "Only pending payment requests can be verified.",
      },
      {
        status: 409,
      }
    );
  }

  if (message.includes("PAYMENT_EXPIRED")) {
    return NextResponse.json(
      {
        error:
          "This payment request has expired. Ask the user to submit a new request.",
      },
      {
        status: 409,
      }
    );
  }

  if (message.includes("PAYMENT_AMOUNT_TOO_LOW")) {
    return NextResponse.json(
      {
        error:
          "The submitted amount is below the official Premium price.",
      },
      {
        status: 400,
      }
    );
  }

  console.error("Admin payment update failed:", error);

  return NextResponse.json(
    {
      error: "Unable to update payment request.",
    },
    {
      status: 500,
    }
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  let adminUser;

  try {
    adminUser = await requireAdmin();
  } catch {
    return NextResponse.json(
      {
        error: "Admin access required.",
      },
      {
        status: 403,
      }
    );
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const note = String(body?.note ?? "")
    .trim()
    .slice(0, 1000);

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      {
        error: "Choose approve or reject.",
      },
      {
        status: 400,
      }
    );
  }

  await expirePendingPaymentRequests();

  const admin = createAdminClient();
  const functionName =
    action === "approve"
      ? "approve_premium_payment_request"
      : "reject_premium_payment_request";

  const { data, error } = await admin.rpc(functionName, {
    payment_id: id,
    admin_user_id: adminUser.id,
    verification_note: note || null,
  });

  if (error) {
    return paymentErrorResponse(error);
  }

  return NextResponse.json({
    message:
      action === "approve"
        ? "Payment approved and Premium activated."
        : "Payment rejected.",
    result: data,
  });
}
