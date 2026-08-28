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
  "coordinates-bulk",
  "ai",
  "image-editor",
  "background-remover",
  "photo-enhancer",
  "object-remover",
  "face-retouch",
  "image-upscaler",
  "image-colorizer",
  "image-to-text",
  "summarize-pdf",
  "chat-with-pdf",
  "translate-document",
  "resume-builder",
]);

const LIMITED_TOOL_NAMES = Array.from(LIMITED_TOOLS);

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

type SupabasePlanUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function normalizeTool(tool?: string) {
  return tool?.trim().toLowerCase();
}

function isLimitedTool(tool?: string) {
  const toolName = normalizeTool(tool);

  if (!toolName) {
    return true;
  }

  return LIMITED_TOOLS.has(toolName);
}

function isPremiumValue(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  return ["premium", "pro", "paid"].includes(
    value.toLowerCase()
  );
}

function isPremiumUser(user: SupabasePlanUser) {
  return (
    isPremiumValue(user.app_metadata?.plan) ||
    isPremiumValue(user.user_metadata?.plan) ||
    isPremiumValue(user.app_metadata?.subscription) ||
    isPremiumValue(user.user_metadata?.subscription)
  );
}

function buildUnlimitedResult(
  identityType: UsageIdentityType,
  identityId: string
): UsageLimitResult {
  return {
    allowed: true,
    reason: null,
    remaining: UNLIMITED_LIMIT,
    used: 0,
    limit: UNLIMITED_LIMIT,
    identityType,
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

async function getOrCreateGuestId() {
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

  return guestId;
}

export async function checkUsageLimit(
  tool?: string
): Promise<UsageLimitResult> {
  const shouldLimit = isLimitedTool(tool);

  const since = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!shouldLimit) {
      if (user) {
        return buildUnlimitedResult("user", user.id);
      }

      const guestId = await getOrCreateGuestId();

      return buildUnlimitedResult("guest", guestId);
    }

    if (user) {
      const typedUser = user as SupabasePlanUser;

      if (isPremiumUser(typedUser)) {
        return buildUnlimitedResult("user", typedUser.id);
      }

      const { count, error } = await supabase
        .from("conversion_usage")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", typedUser.id)
        .in("tool", LIMITED_TOOL_NAMES)
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

    const guestId = await getOrCreateGuestId();
    const admin = createAdminClient();

    const { count, error } = await admin
      .from("conversion_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("guest_id", guestId)
      .in("tool", LIMITED_TOOL_NAMES)
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
  } catch (error) {
    console.error(
      "Usage limit check failed:",
      error
    );

    return allowWhenUsageCheckFails(
      "guest",
      "usage-check-failed",
      shouldLimit ? GUEST_LIMIT : UNLIMITED_LIMIT
    );
  }
}