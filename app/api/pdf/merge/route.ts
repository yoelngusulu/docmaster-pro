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
        success: false,
        message: usage.reason,
        remaining:
          usage.remaining,
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

    const uploadedFiles =
      formData
        .getAll("files")
        .filter(
          (item): item is File =>
            item instanceof File
        );

    if (
      uploadedFiles.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please upload at least two PDF files.",
        },
        {
          status: 400,
        }
      );
    }

    const maximumFileSize =
      100 * 1024 * 1024;

    for (
      const file of uploadedFiles
    ) {
      if (file.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is empty.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        file.size >
        maximumFileSize
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} exceeds the 100 MB file size limit.`,
          },
          {
            status: 413,
          }
        );
      }

      if (
        !file.name
          .toLowerCase()
          .endsWith(".pdf")
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only PDF files are allowed.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const mergedPdf =
      await PDFDocument.create();

    for (
      const file of uploadedFiles
    ) {
      const bytes =
        await file.arrayBuffer();

      const pdf =
        await PDFDocument.load(
          bytes
        );

      const pages =
        await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

      pages.forEach(
        (page) => {
          mergedPdf.addPage(
            page
          );
        }
      );
    }

    const mergedBytes =
      await mergedPdf.save();

    if (
      mergedBytes.byteLength === 0
    ) {
      throw new Error(
        "The merged PDF is empty."
      );
    }

    // One successful merge =
    // one usage record.
    await recordConversionUsage({
      tool: "merge-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      Buffer.from(
        mergedBytes
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            'attachment; filename="Merged.pdf"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Merge PDF error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to merge PDFs.",
      },
      {
        status: 500,
      }
    );
  }
}