import { createAdminClient } from "@/lib/supabase/admin";

type RecordUsageParams = {
  tool: string;
  identityType: "user" | "guest";
  identityId: string;
};

export async function recordConversionUsage({
  tool,
  identityType,
  identityId,
}: RecordUsageParams) {
  const admin = createAdminClient();

  const payload = {
    user_id:
      identityType === "user"
        ? identityId
        : null,
    guest_id:
      identityType === "guest"
        ? identityId
        : null,
    tool,
  };

  const { error } = await admin
    .from("conversion_usage")
    .insert(payload);

  if (error) {
    console.error(
      "Unable to record conversion usage:",
      error
    );

    throw new Error(
      "Unable to record conversion usage."
    );
  }
}
