import { createClient } from "@/lib/supabase/server";

export type AuthorizedAdmin = {
  id: string;
  email: string | null;
};

type SupabaseUserForAdmin = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
};

function getAllowedAdminEmails() {
  return (process.env.DOCMASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function hasAdminMetadata(user: SupabaseUserForAdmin) {
  const role = user.app_metadata?.role;
  const isAdmin = user.app_metadata?.is_admin;

  return role === "admin" || isAdmin === true;
}

export function isAuthorizedAdmin(user: SupabaseUserForAdmin) {
  if (hasAdminMetadata(user)) {
    return true;
  }

  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return getAllowedAdminEmails().includes(email);
}

export async function requireAdmin(): Promise<AuthorizedAdmin> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAuthorizedAdmin(user as SupabaseUserForAdmin)) {
    throw new Error("ADMIN_REQUIRED");
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}
