import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

import { runQpdf } from "@/lib/pdf/qpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  let tempDirectory = "";

  try {
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    const passwordValue =
      formData.get("password");

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
      typeof passwordValue !== "string" ||
      passwordValue.trim().length < 6
    ) {
      return NextResponse.json(
        {
          message:
            "Password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !uploadedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          message:
            "Only PDF files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    tempDirectory =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "docmaster-protect-"
        )
      );

    const uniqueId =
      crypto.randomUUID();

    const inputPath =
      path.join(
        tempDirectory,
        `${uniqueId}-input.pdf`
      );

    const outputPath =
      path.join(
        tempDirectory,
        `${uniqueId}-protected.pdf`
      );

    const inputBytes =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await writeFile(
      inputPath,
      inputBytes
    );

    const userPassword =
      passwordValue.trim();

    const ownerPassword =
      crypto.randomBytes(24).toString(
        "hex"
      );

    await runQpdf([
      "--encrypt",
      userPassword,
      ownerPassword,
      "256",
      "--",
      inputPath,
      outputPath,
    ]);

    const protectedPdf =
      await readFile(outputPath);

    const originalName =
      uploadedFile.name.replace(
        /\.pdf$/i,
        ""
      );

    return new Response(
      protectedPdf,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="${originalName}-protected.pdf"`,
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Protect PDF error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to protect the PDF.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (tempDirectory) {
      await rm(
        tempDirectory,
        {
          recursive: true,
          force: true,
        }
      ).catch(() => undefined);
    }
  }
}