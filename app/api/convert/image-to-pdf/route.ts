import { execFile } from "child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);

function sanitizeFileName(
  fileName: string,
  index: number
) {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  return `image-${String(index + 1).padStart(
    3,
    "0"
  )}${extension}`;
}

function getPythonCommand() {
  return process.env.PYTHON_PATH || "python";
}

export async function POST(
  request: Request
) {
  const usage =
    await checkUsageLimit("image-to-pdf");

  if (!usage.allowed) {
    return Response.json(
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

  const temporaryDirectory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "docmaster-image-to-pdf-"
      )
    );

  try {
    const formData =
      await request.formData();

    const files = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File
      );

    if (files.length === 0) {
      return Response.json(
        {
          error:
            "Please upload at least one image.",
        },
        {
          status: 400,
        }
      );
    }

    const inputPaths: string[] = [];

    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      const file = files[index];

      const extension = path
        .extname(file.name)
        .toLowerCase();

      if (
        !allowedExtensions.has(
          extension
        )
      ) {
        return Response.json(
          {
            error:
              `Unsupported image format: ${file.name}`,
          },
          {
            status: 400,
          }
        );
      }

      const safeFileName =
        sanitizeFileName(
          file.name,
          index
        );

      const inputPath = path.join(
        temporaryDirectory,
        safeFileName
      );

      const fileBuffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      await writeFile(
        inputPath,
        fileBuffer
      );

      inputPaths.push(inputPath);
    }

    const outputPath = path.join(
      temporaryDirectory,
      "images-to-pdf.pdf"
    );

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "image_to_pdf.py"
    );

    try {
      await execFileAsync(
        getPythonCommand(),
        [
          scriptPath,
          outputPath,
          ...inputPaths,
        ],
        {
          windowsHide: true,
          maxBuffer:
            10 * 1024 * 1024,
        }
      );
    } catch (conversionError) {
      const errorMessage =
        conversionError instanceof Error
          ? conversionError.message
          : "Unknown Python error.";

      console.error(
        "Image to PDF conversion failed:",
        conversionError
      );

      return Response.json(
        {
          error:
            `Unable to convert images to PDF. ${errorMessage}`,
        },
        {
          status: 500,
        }
      );
    }

    const pdfBuffer =
      await readFile(outputPath);

    if (
      pdfBuffer.byteLength === 0
    ) {
      throw new Error(
        "The generated PDF file is empty."
      );
    }

    await recordConversionUsage({
      tool: "image-to-pdf",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new Response(
      pdfBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            'attachment; filename="images-to-pdf.pdf"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Image to PDF API error:",
      error
    );

    return Response.json(
      {
        error:
          "Something went wrong while processing the images.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}