import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "pdf-to-word-")
  );

  const inputPath = path.join(tempDir, `${randomUUID()}.pdf`);
  const outputPath = path.join(tempDir, `${randomUUID()}.docx`);

  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(inputPath, bytes);

    await new Promise<void>((resolve, reject) => {
      const python = spawn("python", [
        "scripts/pdf_to_word.py",
        inputPath,
        outputPath,
      ]);

      let error = "";

      python.stderr.on("data", (data) => {
        error += data.toString();
      });

      python.on("error", reject);

      python.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(error));
        }
      });
    });

    const output = await fs.readFile(outputPath);

    return new NextResponse(output, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          'attachment; filename="converted.docx"',
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to convert PDF to Word.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}
