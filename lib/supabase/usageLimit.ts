import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FREE_LIMIT = 3;
const WINDOW_HOURS = 24;
const GUEST_COOKIE_NAME = "docmaster_guest_id";

export async function checkUsageLimit() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date(
    Date.now() -
      WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Logged-in user
  if (user) {
    const {
      count,
      error,
    } = await supabase
      .from("conversion_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .gte("created_at", since);

    if (error) {
      console.error(
        "Unable to check logged-in usage:",
        error
      );

      return {
        allowed: false,
        reason:
          "Unable to verify your usage limit.",
        remaining: 0,
        used: 0,
        limit: FREE_LIMIT,
        identityType: "user" as const,
        identityId: user.id,
      };
    }

    const used = count ?? 0;

    return {
      allowed: used < FREE_LIMIT,
      reason:
        used >= FREE_LIMIT
          ? "You have reached your free conversion limit for the last 24 hours."
          : "",
      remaining: Math.max(
        FREE_LIMIT - used,
        0
      ),
      used,
      limit: FREE_LIMIT,
      identityType: "user" as const,
      identityId: user.id,
    };
  }

  // Guest user
  const cookieStore = await cookies();

  let guestId =
    cookieStore.get(
      GUEST_COOKIE_NAME
    )?.value;

  if (!guestId) {
    guestId = randomUUID();

    cookieStore.set(
      GUEST_COOKIE_NAME,
      guestId,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          60 * 60 * 24 * 365,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    count,
    error,
  } = await admin
    .from("conversion_usage")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("guest_id", guestId)
    .gte("created_at", since);

  if (error) {
    console.error(
      "Unable to check guest usage:",
      error
    );

    return {
      allowed: false,
      reason:
        "Unable to verify your usage limit.",
      remaining: 0,
      used: 0,
      limit: FREE_LIMIT,
      identityType: "guest" as const,
      identityId: guestId,
    };
  }

  const used = count ?? 0;

  return {
    allowed: used < FREE_LIMIT,
    reason:
      used >= FREE_LIMIT
        ? "You have reached your free conversion limit for the last 24 hours."
        : "",
    remaining: Math.max(
      FREE_LIMIT - used,
      0
    ),
    used,
    limit: FREE_LIMIT,
    identityType: "guest" as const,
    identityId: guestId,
  };
}