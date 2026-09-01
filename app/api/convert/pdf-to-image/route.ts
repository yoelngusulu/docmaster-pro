import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import JSZip from "jszip";

import {
  NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
  isNativeDependencyError,
  isPythonRuntimeError,
  runNativeExecutable,
} from "@/lib/nativeExecutables";
import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createZipFile(
  sourceFolder: string,
  zipPath: string
): Promise<void> {
  const files =
    await fs.promises.readdir(
      sourceFolder
    );

  const zip = new JSZip();

  for (const fileName of files) {
    const filePath = path.join(
      sourceFolder,
      fileName
    );

    const stat =
      await fs.promises.stat(
        filePath
      );

    if (!stat.isFile()) {
      continue;
    }

    zip.file(
      fileName,
      await fs.promises.readFile(
        filePath
      )
    );
  }

  const zipBuffer =
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
    });

  await fs.promises.writeFile(
    zipPath,
    zipBuffer
  );
}

export async function POST(
  request: NextRequest
) {
  const usage =
    await checkUsageLimit("pdf-to-image");

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason,
        remaining:
          usage.remaining,
        limit: usage.limit,
      },
      {
        status: 429,
      }
    );
  }

  let tempDir = "";

  try {
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No PDF file was uploaded.",
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

    if (
      !uploadedFile.name.toLowerCase().endsWith(".pdf") ||
      (uploadedFile.type && uploadedFile.type !== "application/pdf")
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

    tempDir = path.join(
      os.tmpdir(),
      `docmaster-pdf-images-${randomUUID()}`
    );

    const outputFolder =
      path.join(
        tempDir,
        "images"
      );

    await fs.promises.mkdir(
      outputFolder,
      {
        recursive: true,
      }
    );

    const safeOriginalName =
      uploadedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const inputPath =
      path.join(
        tempDir,
        safeOriginalName
      );

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer()
      );

    await fs.promises.writeFile(
      inputPath,
      fileBuffer
    );

    const scriptPath =
      path.join(
        process.cwd(),
        "scripts",
        "pdf_to_image.py"
      );

    if (!fs.existsSync(scriptPath)) {
      throw new Error(
        "PDF to image conversion service is not configured."
      );
    }

    const conversionResult =
      await runNativeExecutable(
        "python",
        [
          scriptPath,
          inputPath,
          outputFolder,
        ],
        {
          timeoutMs: 120000,
        }
      );

    if (conversionResult.exitCode !== 0) {
      throw new Error(
        conversionResult.stderr.trim() ||
          conversionResult.stdout.trim() ||
          "Python conversion failed."
      );
    }

    const generatedFiles =
      await fs.promises.readdir(
        outputFolder
      );

    if (
      generatedFiles.length === 0
    ) {
      throw new Error(
        "No images were created from the PDF."
      );
    }

    const zipPath =
      path.join(
        tempDir,
        "pdf-images.zip"
      );

    await createZipFile(
      outputFolder,
      zipPath
    );

    const zipBuffer =
      await fs.promises.readFile(
        zipPath
      );

    if (
      zipBuffer.byteLength === 0
    ) {
      throw new Error(
        "The generated ZIP file is empty."
      );
    }

    const originalName =
      path
        .parse(
          uploadedFile.name
        )
        .name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

    const downloadName =
      `${originalName}-images.zip`;

    await recordConversionUsage({
      tool: "pdf-to-image",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      zipBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${downloadName}"`,

          "Content-Length":
            zipBuffer.length.toString(),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "PDF to Image error:",
      error
    );

    if (
      isNativeDependencyError(error) ||
      isPythonRuntimeError(error)
    ) {
      return NextResponse.json(
        {
          error: NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to convert PDF to images.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (tempDir) {
      try {
        await fs.promises.rm(
          tempDir,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (cleanupError) {
        console.error(
          "Unable to remove temporary files:",
          cleanupError
        );
      }
    }
  }
}
