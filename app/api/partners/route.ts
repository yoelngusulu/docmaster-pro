import { NextRequest, NextResponse } from "next/server";

import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedPartnershipTypes = new Set([
  "Technology Partner",
  "Business Partner",
  "Strategic Partner",
  "Affiliate Partner",
]);

// Best-effort per-instance throttling. Origin validation and server-side
// validation remain the primary controls; production-wide rate limiting
// should be added at the edge if abuse patterns emerge.
const submissions = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 5;

function tooManyRequests(key: string) {
  const now = Date.now();
  const recent = (submissions.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS) {
    submissions.set(key, recent);
    return true;
  }
  recent.push(now);
  submissions.set(key, recent);
  return false;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) {
    return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  if (tooManyRequests(ip)) {
    return NextResponse.json({ error: "Too many inquiries. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Honeypot: silently accept automated submissions without storing them.
  if (cleanText(body.website, 200)) {
    return NextResponse.json({ message: "Inquiry received." });
  }

  const fullName = cleanText(body.fullName, 120);
  const organization = cleanText(body.organization, 160);
  const email = cleanText(body.email, 254).toLowerCase();
  const partnershipType = cleanText(body.partnershipType, 40);
  const message = cleanText(body.inquiry, 3000);

  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !allowedPartnershipTypes.has(partnershipType) || message.length < 10) {
    return NextResponse.json({ error: "Please check the required fields and try again." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("partner_inquiries").insert({
      full_name: fullName,
      organization: organization || null,
      email,
      partnership_type: partnershipType,
      message,
    });

    if (error) {
      console.error("Partner inquiry could not be saved:", error.message);
      return NextResponse.json({ error: "We could not save your inquiry right now. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ message: "Inquiry received." }, { status: 201 });
  } catch (error) {
    console.error("Partner inquiry endpoint failed:", error);
    return NextResponse.json({ error: "We could not save your inquiry right now. Please try again later." }, { status: 500 });
  }
}
