import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
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

    const outputName =
      uploadedFile.name.replace(
        /\.pdf$/i,
        ""
      ) + "-compressed.pdf";

    return new Response(
      compressedBytes,
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