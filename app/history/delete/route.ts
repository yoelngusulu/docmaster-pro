import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.json();

  const id = body?.id;

  if (!id) {
    return NextResponse.json(
      {
        error:
          "Conversion ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  const { error } = await supabase
    .from("conversion_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "Unable to delete conversion history:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete conversion history.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
  });
}