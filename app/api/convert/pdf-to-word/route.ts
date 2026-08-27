import {
  NextRequest,
  NextResponse,
} from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONVERSION_TIMEOUT_MS =
  120_000;

export async function POST(
  request: NextRequest
) {
  // Check usage limit before starting conversion.
  const usage =
    await checkUsageLimit("pdf-to-word");

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

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "pdf-to-word-"
      )
    );

  const inputPath =
    path.join(
      tempDir,
      `${randomUUID()}.pdf`
    );

  const outputPath =
    path.join(
      tempDir,
      `${randomUUID()}.docx`
    );

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size === 0) {
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

    const bytes =
      Buffer.from(
        await file.arrayBuffer()
      );

    await fs.writeFile(
      inputPath,
      bytes
    );

    await new Promise<void>(
      (resolve, reject) => {
        const python = spawn(
          "python",
          [
            "scripts/pdf_to_word.py",
            inputPath,
            outputPath,
          ],
          {
            windowsHide: true,
          }
        );

        let stderr = "";
        let stdout = "";
        let finished = false;

        const finishWithError = (
          error: Error
        ) => {
          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timeout
          );

          reject(error);
        };

        const timeout =
          setTimeout(() => {
            if (finished) {
              return;
            }

            python.kill();

            finishWithError(
              new Error(
                "PDF conversion timed out because the document layout is too complex."
              )
            );
          }, CONVERSION_TIMEOUT_MS);

        python.stdout.on(
          "data",
          (data) => {
            const text =
              data.toString();

            stdout += text;

            console.log(
              "[pdf-to-word]",
              text.trim()
            );
          }
        );

        python.stderr.on(
          "data",
          (data) => {
            const text =
              data.toString();

            stderr += text;

            console.error(
              "[pdf-to-word]",
              text.trim()
            );
          }
        );

        python.on(
          "error",
          (error) => {
            finishWithError(
              error
            );
          }
        );

        python.on(
          "close",
          (code) => {
            if (finished) {
              return;
            }

            finished = true;

            clearTimeout(
              timeout
            );

            if (code === 0) {
              resolve();
              return;
            }

            reject(
              new Error(
                stderr ||
                  stdout ||
                  "PDF conversion failed."
              )
            );
          }
        );
      }
    );

    const output =
      await fs.readFile(
        outputPath
      );

    if (
      output.byteLength === 0
    ) {
      throw new Error(
        "The converted Word file is empty."
      );
    }

    // Record usage only after a successful conversion.
  await recordConversionUsage({
  tool: "pdf-to-word",
  identityType: usage.identityType,
  identityId: usage.identityId,
});

    return new NextResponse(
      output,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          "Content-Disposition":
            'attachment; filename="converted.docx"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to convert PDF to Word.";

    console.error(
      "PDF to Word API error:",
      error
    );

    const isTimeout =
      message.includes(
        "timed out"
      );

    return NextResponse.json(
      {
        error: isTimeout
          ? "This PDF has a complex layout and could not be converted within 2 minutes. Try a simpler PDF."
          : message,
      },
      {
        status: isTimeout
          ? 408
          : 500,
      }
    );
  } finally {
    await fs.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}