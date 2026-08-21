import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  const usage =
    await checkUsageLimit();

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
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (
      !(uploadedFile instanceof File)
    ) {
      return NextResponse.json(
        {
          message:
            "Please upload one PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size === 0
    ) {
      return NextResponse.json(
        {
          message:
            "The uploaded PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const maximumFileSize =
      100 * 1024 * 1024;

    if (
      uploadedFile.size >
      maximumFileSize
    ) {
      return NextResponse.json(
        {
          message:
            "Maximum file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const sourceBytes =
      new Uint8Array(
        await uploadedFile.arrayBuffer()
      );

    const pdfDocument =
      await PDFDocument.load(
        sourceBytes
      );

    const compressedBytes =
      await pdfDocument.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

    if (
      compressedBytes.byteLength === 0
    ) {
      throw new Error(
        "The compressed PDF is empty."
      );
    }

    const outputName =
      uploadedFile.name.replace(
        /\.pdf$/i,
        ""
      ) + "-compressed.pdf";

    await recordConversionUsage({
      tool: "compress-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new Response(
      Buffer.from(
        compressedBytes
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${outputName}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Compress PDF error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to compress PDF.",
      },
      {
        status: 500,
      }
    );
  }
}