import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function hasPremiumMetadata(value: unknown) {
  return (
    typeof value === "string" &&
    ["premium", "pro", "paid"].includes(value.toLowerCase())
  );
}

/**
 * Show ads to visitors and confirmed free accounts only.
 * Hide ads when the account or subscription status cannot be confirmed.
 */
export async function canServeAdsForCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return false;
    }

    if (!user) {
      return true;
    }

    if (
      hasPremiumMetadata(user.app_metadata?.plan) ||
      hasPremiumMetadata(user.app_metadata?.subscription)
    ) {
      return false;
    }

    const admin = createAdminClient();
    const { data: subscription, error: subscriptionError } = await admin
      .from("user_subscriptions")
      .select("subscription_status, expires_at")
      .eq("user_id", user.id)
      .eq("plan", "PREMIUM")
      .maybeSingle();

    if (subscriptionError) {
      return false;
    }

    const hasActivePremium =
      subscription?.subscription_status === "ACTIVE" &&
      new Date(subscription.expires_at).getTime() > Date.now();

    return !hasActivePremium;
  } catch {
    return false;
  }
}