import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const isPasswordReset = nextPath === "/update-password";

  if (!code) {
    const destination = isPasswordReset
      ? "/forgot-password?error=missing-code"
      : "/login?error=auth-callback";
    return NextResponse.redirect(new URL(destination, "https://yaju-tools.com"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    const destination = isPasswordReset
      ? "/forgot-password?error=reset-link-invalid"
      : "/login?error=auth-callback";
    return NextResponse.redirect(new URL(destination, "https://yaju-tools.com"));
  }

  return NextResponse.redirect(
    new URL(nextPath || "/dashboard", "https://yaju-tools.com")
  );
}
