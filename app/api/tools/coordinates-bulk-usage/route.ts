import { NextResponse } from "next/server";

import { recordConversionUsage } from "@/lib/supabase/recordUsage";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const usage = await checkUsageLimit("coordinates-bulk");

  if (!usage.allowed) {
    return NextResponse.json(
      {
        message: usage.reason,
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: 429,
      }
    );
  }

  try {
    await recordConversionUsage({
      tool: "coordinates-bulk",
      identityType: usage.identityType,
      identityId: usage.identityId,
    });
  } catch (error) {
    console.error(
      "Unable to record coordinates bulk usage:",
      error
    );
  }

  return NextResponse.json({
    allowed: true,
    remaining: usage.remaining,
    limit: usage.limit,
  });
}