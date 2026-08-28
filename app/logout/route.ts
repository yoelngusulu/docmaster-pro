import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/", request.nextUrl.origin)
  );
}