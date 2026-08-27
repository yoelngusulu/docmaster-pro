import {
  NextRequest,
  NextResponse,
} from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

import { checkUsageLimit } from "@/lib/supabase/usageLimit";
import { recordConversionUsage } from "@/lib/supabase/recordUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
) {
  const usage =
    await checkUsageLimit("pdf-to-excel");

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

  let inputPath = "";
  let outputPath = "";

  try {
    const formData =
      await req.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No PDF uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type &&
      file.type !==
        "application/pdf"
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
      file.size >
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

    const tempDir =
      os.tmpdir();

    inputPath = path.join(
      tempDir,
      `${randomUUID()}.pdf`
    );

    outputPath = path.join(
      tempDir,
      `${randomUUID()}.xlsx`
    );

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
        const python =
          spawn(
            "python",
            [
              path.join(process.cwd(), "scripts", "pdf_to_excel.py"),
              inputPath,
              outputPath,
            ]
          );

        let standardError = "";

        python.stderr.on(
          "data",
          (data) => {
            standardError +=
              data.toString();
          }
        );

        python.on(
          "error",
          (error) => {
            reject(
              new Error(
                `Unable to start Python: ${error.message}`
              )
            );
          }
        );

        python.on(
          "close",
          (code) => {
            if (code === 0) {
              resolve();
              return;
            }

            reject(
              new Error(
                standardError ||
                  `Python exited with code ${code}.`
              )
            );
          }
        );
      }
    );

    const excel =
      await fs.readFile(
        outputPath
      );

    if (
      excel.byteLength === 0
    ) {
      throw new Error(
        "The converted Excel file is empty."
      );
    }

    await recordConversionUsage({
      tool: "pdf-to-excel",
      identityType:
        usage.identityType,
      identityId:
        usage.identityId,
    });

    return new NextResponse(
      excel,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            'attachment; filename="converted.xlsx"',

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to convert PDF to Excel.";

    console.error(
      "PDF to Excel error:",
      err
    );

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  } finally {
    if (inputPath) {
      await fs
        .unlink(inputPath)
        .catch(() => {});
    }

    if (outputPath) {
      await fs
        .unlink(outputPath)
        .catch(() => {});
    }
  }
}