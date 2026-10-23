import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedOrigin(request: NextRequest): boolean {
  const allowedHosts = new Set([
    "yaju-tools.com",
    "www.yaju-tools.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ]);
  if (process.env.VERCEL_URL) allowedHosts.add(process.env.VERCEL_URL);

  // Browsers commonly omit Origin on same-origin GET requests. In that case,
  // allow the request only when its own Host is one of our known app hosts.
  const requestHost = request.headers.get("host") || new URL(request.url).host;
  if (!allowedHosts.has(requestHost)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = parsedOrigin.hostname === "localhost"
      || parsedOrigin.hostname === "127.0.0.1";
    const protocolIsAllowed = parsedOrigin.protocol === "https:"
      || (isLocalHost && parsedOrigin.protocol === "http:");
    return protocolIsAllowed && allowedHosts.has(parsedOrigin.host);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId || !/^[A-Za-z0-9-]{10,80}$/.test(jobId)) {
    return NextResponse.json({ message: "A valid conversion job ID is required." }, { status: 400 });
  }

  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Conversion service is not configured yet. Add CLOUDCONVERT_API_KEY to the Vercel environment variables." },
      { status: 503 }
    );
  }

  try {
    const cloudResponse = await fetch(
      "https://api.cloudconvert.com/v2/jobs/" + encodeURIComponent(jobId),
      {
        method: "GET",
        headers: { Authorization: "Bearer " + apiKey },
        cache: "no-store",
      }
    );

    const cloudData = await cloudResponse.json().catch(() => null) as {
      message?: string;
      data?: {
        status?: string;
        tasks?: Array<{
          name?: string;
          status?: string;
          message?: string;
          result?: { files?: Array<{ filename?: string; url?: string }> };
        }>;
      };
    } | null;

    if (!cloudResponse.ok || !cloudData?.data) {
      return NextResponse.json(
        { message: cloudData?.message || "Could not read the conversion status." },
        { status: 502 }
      );
    }

    const job = cloudData.data;
    const exportTask = job.tasks?.find((task) => task.name === "export-file");
    const outputFile = exportTask?.result?.files?.[0];
    let fileUrl: string | undefined;

    if (outputFile?.url) {
      try {
        const parsedUrl = new URL(outputFile.url);
        const trustedHost = parsedUrl.hostname === "cloudconvert.com"
          || parsedUrl.hostname.endsWith(".cloudconvert.com");
        if (parsedUrl.protocol === "https:" && trustedHost) {
          fileUrl = parsedUrl.toString();
        }
      } catch {
        fileUrl = undefined;
      }
    }

    const failedTask = job.tasks?.find((task) => task.status === "error");
    return NextResponse.json({
      success: true,
      status: job.status || "processing",
      fileUrl,
      fileName: outputFile?.filename,
      message: failedTask?.message,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { message: "Could not connect to CloudConvert. Please try again." },
      { status: 502 }
    );
  }
}
