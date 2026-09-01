import { spawn } from "child_process";

export type NativeExecutable =
  | "python"
  | "qpdf"
  | "libreoffice";

export const NATIVE_CONVERSION_UNAVAILABLE_MESSAGE =
  "This conversion service is temporarily unavailable on this server.";

type NativeExecutableDefinition = {
  displayName: string;
  envVars: string[];
  windowsCandidates: string[];
  linuxCandidates: string[];
  versionArgs: string[];
};

type NativeRunOptions = {
  timeoutMs?: number;
  cwd?: string;
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
};

export type NativeRunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const definitions: Record<NativeExecutable, NativeExecutableDefinition> = {
  python: {
    displayName: "Python",
    envVars: ["PYTHON_EXECUTABLE", "PYTHON_PATH"],
    windowsCandidates: ["python", "py"],
    linuxCandidates: ["python3", "python"],
    versionArgs: ["--version"],
  },
  qpdf: {
    displayName: "QPDF",
    envVars: ["QPDF_PATH"],
    windowsCandidates: [
      String.raw`C:\Program Files\qpdf 12.3.2\bin\qpdf.exe`,
      "qpdf",
    ],
    linuxCandidates: ["qpdf"],
    versionArgs: ["--version"],
  },
  libreoffice: {
    displayName: "LibreOffice",
    envVars: ["LIBREOFFICE_PATH", "SOFFICE_PATH"],
    windowsCandidates: [
      String.raw`C:\Program Files\LibreOffice\program\soffice.exe`,
      String.raw`C:\Program Files (x86)\LibreOffice\program\soffice.exe`,
      "soffice",
      "libreoffice",
    ],
    linuxCandidates: ["soffice", "libreoffice"],
    versionArgs: ["--version"],
  },
};

export class NativeDependencyError extends Error {
  statusCode = 503;

  constructor(public dependency: NativeExecutable) {
    super(`${definitions[dependency].displayName} is not available on this server.`);
    this.name = "NativeDependencyError";
  }
}

function getCandidates(executable: NativeExecutable) {
  const definition = definitions[executable];
  const envCandidates = definition.envVars.flatMap((envVar) => {
    const value = process.env[envVar]?.trim();

    return value ? [value] : [];
  });

  return [
    ...envCandidates,
    ...(process.platform === "win32"
      ? definition.windowsCandidates
      : definition.linuxCandidates),
  ];
}

function canStart(command: string, args: string[]) {
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const finish = (available: boolean) => {
      if (!settled) {
        settled = true;
        resolve(available);
      }
    };

    const child = spawn(command, args, {
      windowsHide: true,
      stdio: "ignore",
    });

    child.on("error", () => finish(false));
    child.on("close", () => finish(true));
  });
}

export async function resolveNativeExecutable(executable: NativeExecutable) {
  const definition = definitions[executable];

  for (const candidate of getCandidates(executable)) {
    if (await canStart(candidate, definition.versionArgs)) {
      return candidate;
    }
  }

  throw new NativeDependencyError(executable);
}

export async function runNativeExecutable(
  executable: NativeExecutable,
  args: string[],
  options: NativeRunOptions = {}
): Promise<NativeRunResult> {
  const command = await resolveNativeExecutable(executable);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;

    const finish = (callback: () => void) => {
      if (!settled) {
        settled = true;

        if (timeout) {
          clearTimeout(timeout);
        }

        callback();
      }
    };

    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (options.timeoutMs) {
      timeout = setTimeout(() => {
        child.kill();

        finish(() => {
          reject(new Error("Conversion timed out."));
        });
      }, options.timeoutMs);
    }

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    child.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(new NativeDependencyError(executable));
          return;
        }

        reject(error);
      });
    });

    child.on("close", (code) => {
      finish(() => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
        });
      });
    });
  });
}

export function isNativeDependencyError(
  error: unknown
): error is NativeDependencyError {
  return error instanceof NativeDependencyError;
}

export function isPythonRuntimeError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error || "").toLowerCase();

  return (
    message.includes("modulenotfounderror") ||
    message.includes("no module named") ||
    message.includes("importerror") ||
    message.includes("unable to start python")
  );
}
