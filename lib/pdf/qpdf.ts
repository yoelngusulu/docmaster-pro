import { runNativeExecutable } from "@/lib/nativeExecutables";

export async function runQpdf(args: string[]): Promise<void> {
  const result = await runNativeExecutable("qpdf", args);

  if (result.exitCode === 0 || result.exitCode === 3) {
    return;
  }

  throw new Error(
    result.stderr.trim() ||
      `QPDF exited with code ${result.exitCode ?? "unknown"}.`
  );
}
