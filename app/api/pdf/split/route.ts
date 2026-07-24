import {
  NextRequest,
  NextResponse,
} from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

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
          success: false,
          message:
            "Please upload one PDF file.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The uploaded PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      uploadedFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (extension !== "pdf") {
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

    const uploadedBytes =
      await uploadedFile.arrayBuffer();

    const sourceBytes =
      new Uint8Array(
        uploadedBytes
      );

    let sourcePdf: PDFDocument;

    try {
      sourcePdf =
        await PDFDocument.load(
          sourceBytes,
          {
            ignoreEncryption: false,
          }
        );
    } catch (error) {
      console.error(
        "Unable to open PDF:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The PDF could not be opened. It may be damaged or password-protected.",
        },
        {
          status: 400,
        }
      );
    }

    const pageCount =
      sourcePdf.getPageCount();

    if (pageCount < 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The uploaded PDF has no pages.",
        },
        {
          status: 400,
        }
      );
    }

    const zip = new JSZip();

    for (
      let pageIndex = 0;
      pageIndex < pageCount;
      pageIndex++
    ) {
      const pagePdf =
        await PDFDocument.create();

      const [copiedPage] =
        await pagePdf.copyPages(
          sourcePdf,
          [pageIndex]
        );

      pagePdf.addPage(
        copiedPage
      );

      const pageBytes =
        await pagePdf.save();

      zip.file(
        `page-${pageIndex + 1}.pdf`,
        pageBytes
      );
    }

    const zipBytes =
      await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

    if (zipBytes.byteLength === 0) {
      throw new Error(
        "ZIP generation returned an empty file."
      );
    }

    const cleanOriginalName =
      uploadedFile.name
        .replace(/\.pdf$/i, "")
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-"
        )
        .replace(/-+/g, "-")
        .replace(
          /^-|-$/g,
          ""
        );

    const outputFileName =
      `${
        cleanOriginalName ||
        "document"
      }-split-pages.zip`;

    const zipBlob = new Blob(
      [zipBytes],
      {
        type: "application/zip",
      }
    );

    console.log(
      "Split completed:",
      {
        pageCount,
        zipByteLength:
          zipBytes.byteLength,
        blobSize:
          zipBlob.size,
        outputFileName,
      }
    );

    return new Response(
      zipBlob,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/zip",
          "Content-Disposition":
            `attachment; filename="${outputFileName}"`,
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Split PDF route error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    return NextResponse.json(
      {
        success: false,
        message:
          `Unable to split the PDF: ${message}`,
      },
      {
        status: 500,
      }
    );
  }
}