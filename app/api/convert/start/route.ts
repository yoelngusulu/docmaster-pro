import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CONVERSIONS: Record<string, string[]> = {
  pdf: ["docx", "xlsx", "pptx"],
  doc: ["pdf"],
  docx: ["pdf"],
  xls: ["pdf"],
  xlsx: ["pdf"],
  ppt: ["pdf"],
  pptx: ["pdf"],
};

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let host = "";
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }

  const allowedHosts = new Set([
    "yaju-tools.com",
    "www.yaju-tools.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ]);
  if (process.env.VERCEL_URL) allowedHosts.add(process.env.VERCEL_URL);
  return allowedHosts.has(host);
}

function getClientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  const clientKey = getClientKey(request);
  const now = Date.now();
  const existing = requestCounts.get(clientKey);
  if (existing && existing.resetAt > now && existing.count >= RATE_LIMIT) {
    return NextResponse.json(
      { message: "Too many conversion requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }
  if (!existing || existing.resetAt <= now) {
    requestCounts.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    existing.count += 1;
  }

  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Conversion service is not configured yet. Add CLOUDCONVERT_API_KEY to the Vercel environment variables." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null) as {
    filename?: string;
    fileSize?: number;
    inputFormat?: string;
    outputFormat?: string;
  } | null;

  if (
    !body
    || typeof body.filename !== "string"
    || body.filename.length < 1
    || body.filename.length > 255
    || typeof body.fileSize !== "number"
    || !Number.isFinite(body.fileSize)
    || body.fileSize <= 0
    || body.fileSize > MAX_FILE_SIZE
    || typeof body.inputFormat !== "string"
    || typeof body.outputFormat !== "string"
  ) {
    return NextResponse.json(
      { message: "Please select a valid file smaller than 100 MB." },
      { status: 400 }
    );
  }

  const inputFormat = body.inputFormat.toLowerCase();
  const outputFormat = body.outputFormat.toLowerCase();
  const extension = body.filename.split(".").pop()?.toLowerCase();

  if (
    extension !== inputFormat
    || !ALLOWED_CONVERSIONS[inputFormat]?.includes(outputFormat)
  ) {
    return NextResponse.json(
      { message: "This file conversion is not supported." },
      { status: 400 }
    );
  }

  try {
    const cloudResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-file": { operation: "import/upload" },
          "convert-file": {
            operation: "convert",
            input: "import-file",
            input_format: inputFormat,
            output_format: outputFormat,
          },
          "export-file": {
            operation: "export/url",
            input: "convert-file",
          },
        },
        tag: "yaju-document-conversion",
      }),
      cache: "no-store",
    });

    const cloudData = await cloudResponse.json().catch(() => null) as {
      message?: string;
      data?: {
        id?: string;
        tasks?: Array<{
          name?: string;
          result?: {
            form?: {
              url?: string;
              parameters?: Record<string, string | number>;
            };
          };
        }>;
      };
    } | null;

    if (!cloudResponse.ok || !cloudData?.data?.id) {
      return NextResponse.json(
        { message: cloudData?.message || "CloudConvert could not start the job. Check the API key and its permissions." },
        { status: 502 }
      );
    }

    const uploadTask = cloudData.data.tasks?.find((task) => task.name === "import-file");
    const uploadUrl = uploadTask?.result?.form?.url;
    const uploadParameters = uploadTask?.result?.form?.parameters;

    if (!uploadUrl || !uploadParameters) {
      return NextResponse.json(
        { message: "CloudConvert did not return upload instructions." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: cloudData.data.id,
      uploadUrl,
      uploadParameters,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { message: "Could not connect to CloudConvert. Please try again." },
      { status: 502 }
    );
  }
}
