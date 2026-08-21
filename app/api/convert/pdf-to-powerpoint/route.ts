import {
  NextRequest,
  NextResponse,
} from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runPython(
  scriptPath: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [
      scriptPath,
      inputPath,
      outputPath,
    ]);

    let stderr = "";

    pythonProcess.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    pythonProcess.on(
      "error",
      (error) => {
        reject(
          new Error(
            `Unable to start Python: ${error.message}`
          )
        );
      }
    );

    pythonProcess.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            stderr ||
              `Python exited with code ${code}.`
          )
        );
      }
    );
  });
}

export async function POST(
  request: NextRequest
) {
  const usage =
    await checkUsageLimit();

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason,
        remaining: usage.remaining,
        limit: usage.limit,
      },
      {
        status: 429,
      }
    );
  }

  const tempDirectory = path.join(
    os.tmpdir(),
    `docmaster-pdf-to-ppt-${crypto.randomUUID()}`
  );

  try {
    await fs.mkdir(
      tempDirectory,
      {
        recursive: true,
      }
    );

    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF file.",
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
          error:
            "Only PDF files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          error:
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
          error:
            "Maximum file size is 100 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const safeBaseName =
      path
        .parse(uploadedFile.name)
        .name.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        ) || "converted";

    const inputPath = path.join(
      tempDirectory,
      `${safeBaseName}.pdf`
    );

    const outputPath = path.join(
      tempDirectory,
      `${safeBaseName}.pptx`
    );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await fs.writeFile(
      inputPath,
      fileBuffer
    );

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "pdf_to_powerpoint.py"
    );

    await runPython(
      scriptPath,
      inputPath,
      outputPath
    );

    const outputBuffer =
      await fs.readFile(
        outputPath
      );

    if (
      outputBuffer.byteLength === 0
    ) {
      throw new Error(
        "The converted PowerPoint file is empty."
      );
    }

    await recordConversionUsage({
      tool: "pdf-to-powerpoint",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      outputBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",

          "Content-Disposition":
            `attachment; filename="${safeBaseName}.pptx"`,

          "Content-Length":
            outputBuffer.length.toString(),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "PDF to PowerPoint error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF to PowerPoint conversion failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await fs.rm(
      tempDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}