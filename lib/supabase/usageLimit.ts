import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GUEST_LIMIT = 3;
const REGISTERED_LIMIT = 5;
const WINDOW_HOURS = 24;
const UNLIMITED_LIMIT = 999999;
const GUEST_COOKIE_NAME = "docmaster_guest_id";

const LIMITED_TOOLS = new Set([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "ai",
]);

type UsageIdentityType = "user" | "guest";

type UsageLimitResult = {
  allowed: boolean;
  reason: string | null;
  remaining: number;
  used: number;
  limit: number;
  identityType: UsageIdentityType;
  identityId: string;
};

type SupabaseUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function isLimitedTool(tool?: string) {
  if (!tool) {
    return true;
  }

  return LIMITED_TOOLS.has(tool);
}

function isPremiumUser(user: SupabaseUser) {
  return (
    user.app_metadata?.plan === "premium" ||
    user.user_metadata?.plan === "premium" ||
    user.app_metadata?.subscription === "premium" ||
    user.user_metadata?.subscription === "premium"
  );
}

function allowUnlimitedTool(identityId = "free-ad-supported-tool"): UsageLimitResult {
  return {
    allowed: true,
    reason: null,
    remaining: UNLIMITED_LIMIT,
    used: 0,
    limit: UNLIMITED_LIMIT,
    identityType: "guest",
    identityId,
  };
}

function allowWhenUsageCheckFails(
  identityType: UsageIdentityType,
  identityId: string,
  limit: number
): UsageLimitResult {
  return {
    allowed: true,
    reason: null,
    remaining: limit,
    used: 0,
    limit,
    identityType,
    identityId,
  };
}

function buildUsageResult(
  used: number,
  limit: number,
  identityType: UsageIdentityType,
  identityId: string
): UsageLimitResult {
  const allowed = used < limit;

  return {
    allowed,
    reason: allowed
      ? null
      : `You have reached your ${limit} conversion limit for the last 24 hours.`,
    remaining: Math.max(limit - used, 0),
    used,
    limit,
    identityType,
    identityId,
  };
}

export async function checkUsageLimit(
  tool?: string
): Promise<UsageLimitResult> {
  if (!isLimitedTool(tool)) {
    return allowUnlimitedTool();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  if (user) {
    const typedUser = user as SupabaseUser;

    if (isPremiumUser(typedUser)) {
      return allowUnlimitedTool(typedUser.id);
    }

    const { count, error } = await supabase
      .from("conversion_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", typedUser.id)
      .gte("created_at", since);

    if (error) {
      console.error(
        "Unable to check logged-in usage:",
        error
      );

      return allowWhenUsageCheckFails(
        "user",
        typedUser.id,
        REGISTERED_LIMIT
      );
    }

    return buildUsageResult(
      count ?? 0,
      REGISTERED_LIMIT,
      "user",
      typedUser.id
    );
  }

  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    guestId = randomUUID();

    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const admin = createAdminClient();

  const { count, error } = await admin
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

    return allowWhenUsageCheckFails(
      "guest",
      guestId,
      GUEST_LIMIT
    );
  }

  return buildUsageResult(
    count ?? 0,
    GUEST_LIMIT,
    "guest",
    guestId
  );
}