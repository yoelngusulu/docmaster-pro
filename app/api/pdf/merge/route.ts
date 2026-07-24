import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const uploadedFiles = formData.getAll("files") as File[];

    if (uploadedFiles.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload at least two PDF files.",
        },
        { status: 400 }
      );
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of uploadedFiles) {
      const bytes = await file.arrayBuffer();

      const pdf = await PDFDocument.load(bytes);

      const pages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      pages.forEach((page) =>
        mergedPdf.addPage(page)
      );
    }

    const mergedBytes =
      await mergedPdf.save();

    return new NextResponse(mergedBytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          'attachment; filename="Merged.pdf"',
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to merge PDFs.",
      },
      {
        status: 500,
      }
    );
  }
}