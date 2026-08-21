import {
  NextRequest,
  NextResponse,
} from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import crypto from "crypto";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedExtensions = [
  ".doc",
  ".docx",
];

function getLibreOfficePath() {
  if (process.platform === "win32") {
    return "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
  }

  return "soffice";
}

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
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: 429,
      }
    );
  }

  let workingDirectory = "";

  try {
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Word document was uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      path
        .extname(
          uploadedFile.name
        )
        .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only DOC and DOCX files are allowed.",
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
          success: false,
          message:
            "The maximum allowed file size is 100 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueId =
      crypto.randomUUID();

    workingDirectory =
      path.join(
        os.tmpdir(),
        `docmaster-${uniqueId}`
      );

    const outputDirectory =
      path.join(
        workingDirectory,
        "output"
      );

    await fs.mkdir(
      outputDirectory,
      {
        recursive: true,
      }
    );

    const safeBaseName =
      path
        .basename(
          uploadedFile.name,
          extension
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        );

    const inputFilePath =
      path.join(
        workingDirectory,
        `${safeBaseName}${extension}`
      );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await fs.writeFile(
      inputFilePath,
      fileBuffer
    );

    const libreOfficePath =
      getLibreOfficePath();

    await execFileAsync(
      libreOfficePath,
      [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDirectory,
        inputFilePath,
      ],
      {
        timeout: 120000,
        windowsHide: true,
      }
    );

    const convertedFilePath =
      path.join(
        outputDirectory,
        `${safeBaseName}.pdf`
      );

    try {
      await fs.access(
        convertedFilePath
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "LibreOffice did not create the PDF file.",
        },
        {
          status: 500,
        }
      );
    }

    const convertedFile =
      await fs.readFile(
        convertedFilePath
      );

    if (
      convertedFile.byteLength === 0
    ) {
      throw new Error(
        "The converted PDF file is empty."
      );
    }

    await recordConversionUsage({
      tool: "word-to-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      convertedFile,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${safeBaseName}.pdf"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Word to PDF conversion error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to convert the Word document.",
        error: message,
      },
      {
        status: 500,
      }
    );
  } finally {
    if (workingDirectory) {
      await fs.rm(
        workingDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
}