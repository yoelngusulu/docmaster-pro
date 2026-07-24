import { spawn } from "child_process";

export const QPDF =
  process.env.QPDF_PATH ||
  "C:\\Program Files\\qpdf 12.3.2\\bin\\qpdf.exe";

export function runQpdf(
  args: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const qpdfProcess = spawn(
      QPDF,
      args
    );

    let error = "";

    qpdfProcess.stderr.on(
      "data",
      (data) => {
        error += data.toString();
      }
    );

    qpdfProcess.on(
      "error",
      (spawnError) => {
        reject(spawnError);
      }
    );

    qpdfProcess.on(
      "close",
      (code) => {
        if (
          code === 0 ||
          code === 3
        ) {
          resolve();
        } else {
          reject(
            new Error(
              error ||
                `QPDF exited with code ${code}.`
            )
          );
        }
      }
    );
  });
}