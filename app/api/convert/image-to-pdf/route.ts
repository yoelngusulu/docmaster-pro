import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "fs/promises";
import os from "os";
import path from "path";

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

      if (file.size === 0) {
        return Response.json(
          {
            error:
              `The uploaded image is empty: ${file.name}`,
          },
          {
            status: 400,
          }
        );
      }

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

    const conversionResult =
      await runNativeExecutable(
        "python",
        [
          scriptPath,
          outputPath,
          ...inputPaths,
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

    if (
      isNativeDependencyError(error) ||
      isPythonRuntimeError(error)
    ) {
      return Response.json(
        {
          error: NATIVE_CONVERSION_UNAVAILABLE_MESSAGE,
        },
        {
          status: 503,
        }
      );
    }

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
