import { createClient } from "@/lib/supabase/client";

type SaveConversionHistoryParams = {
  tool: string;
  originalFileName: string;
  outputFileName: string;
};

export async function saveConversionHistory({
  tool,
  originalFileName,
  outputFileName,
}: SaveConversionHistoryParams) {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      isAuthenticated: false,
    };
  }

  const { error } = await supabase
    .from("conversion_history")
    .insert({
      user_id: user.id,
      tool,
      original_file_name: originalFileName,
      output_file_name: outputFileName,
    });

  if (error) {
    console.error(
      "Unable to save conversion history:",
      error
    );
  }

  return {
    isAuthenticated: true,
  };
}