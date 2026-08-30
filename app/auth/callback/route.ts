import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(
    requestUrl.searchParams.get("next")
  );

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);

      return NextResponse.redirect(
        new URL(
          "/login?error=auth-callback",
          requestUrl.origin
        )
      );
    }
  }

  return NextResponse.redirect(
    new URL(nextPath || "/update-password", requestUrl.origin)
  );
}
