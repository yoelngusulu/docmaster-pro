import {
  NextRequest,
  NextResponse,
} from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

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

const MAX_FILE_SIZE =
  100 * 1024 * 1024;

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const mimeTypes: Record<
  string,
  string
> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function sanitizeFileName(
  fileName: string
): string {
  return fileName
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "-"
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(
  request: NextRequest
) {
  const usage =
    await checkUsageLimit("compress-image");

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

  let temporaryDirectory = "";

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
          error:
            "Please upload one image file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The uploaded image is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const originalExtension =
      path
        .extname(
          uploadedFile.name
        )
        .toLowerCase();

    if (
      !allowedExtensions.has(
        originalExtension
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, JPEG, PNG and WEBP images are supported.",
        },
        {
          status: 400,
        }
      );
    }

    const fileId =
      randomUUID();

    temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          `docmaster-image-${fileId}-`
        )
      );

    const inputPath =
      path.join(
        temporaryDirectory,
        `input${originalExtension}`
      );

    const outputPath =
      path.join(
        temporaryDirectory,
        `compressed${originalExtension}`
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
      /*turbopackIgnore: true*/ process.cwd(),
      "scripts",
      "compress_image.py"
    );

    try {
      await fs.access(
        scriptPath
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "The image compression service is temporarily unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    const conversionResult =
      await runNativeExecutable(
        "python",
        [
          scriptPath,
          inputPath,
          outputPath,
        ],
        {
          timeoutMs: 120000,
          onStdout: (text) => {
            if (text.trim()) {
              console.log(
                "Image compression:",
                text.trim()
              );
            }
          },
        }
      );

    if (conversionResult.exitCode !== 0) {
      throw new Error(
        conversionResult.stderr.trim() ||
          conversionResult.stdout.trim() ||
          "Python conversion failed."
      );
    }

    const compressedBuffer =
      await fs.readFile(
        outputPath
      );

    if (
      compressedBuffer.length === 0
    ) {
      throw new Error(
        "The compressed image is empty."
      );
    }

    const cleanOriginalName =
      sanitizeFileName(
        path.basename(
          uploadedFile.name,
          originalExtension
        )
      ) || "image";

    const downloadFileName =
      `${cleanOriginalName}-compressed${originalExtension}`;

    const originalSize =
      uploadedFile.size;

    const compressedSize =
      compressedBuffer.length;

    const reductionPercentage =
      originalSize > 0
        ? Math.max(
            0,
            ((originalSize -
              compressedSize) /
              originalSize) *
              100
          ).toFixed(2)
        : "0.00";

    await recordConversionUsage({
      tool: "compress-image",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      compressedBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            mimeTypes[
              originalExtension
            ] ||
            "application/octet-stream",

          "Content-Disposition":
            `attachment; filename="${downloadFileName}"`,

          "Content-Length":
            compressedBuffer.length.toString(),

          "X-Original-Size":
            originalSize.toString(),

          "X-Compressed-Size":
            compressedSize.toString(),

          "X-Reduction-Percentage":
            reductionPercentage,

          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Compress image error:",
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
          "Unable to compress the image.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (temporaryDirectory) {
      await fs
        .rm(
          temporaryDirectory,
          {
            recursive: true,
            force: true,
          }
        )
        .catch(
          (cleanupError) => {
            console.error(
              "Temporary folder cleanup error:",
              cleanupError
            );
          }
        );
    }
  }
}
