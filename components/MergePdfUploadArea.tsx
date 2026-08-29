"use client";

import { saveConversionHistory } from "@/lib/supabase/conversionHistory";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FilePlus2,
  FileText,
  GripVertical,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

const AD_WAIT_SECONDS = 7;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type MergeFileStatus = "reading" | "ready" | "error";
type PageSelectionMode = "all" | "ranges";

type PageRange = {
  start: number;
  end: number;
  label: string;
};

type MergeFileItem = {
  id: string;
  file: File;
  pageCount: number | null;
  status: MergeFileStatus;
  error: string;
  selectionMode: PageSelectionMode;
  pageRanges: string;
};

type SelectionPreview = {
  ranges: PageRange[];
  pageCount: number;
  label: string;
  error: string;
};

type MergePreview = {
  entries: {
    item: MergeFileItem;
    order: number;
    selection: SelectionPreview;
  }[];
  errors: string[];
  totalPages: number;
  estimatedOutputBytes: number;
};

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(bytes / 1024, 0.01).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parsePositiveInteger(value: string) {
  const text = value.trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function createRange(start: number, end: number): PageRange {
  return {
    start,
    end,
    label: start === end ? `Page ${start}` : `Pages ${start}-${end}`,
  };
}

function parsePageRanges(value: string, pageCount: number): SelectionPreview {
  const text = value.trim();

  if (!text) {
    return {
      ranges: [],
      pageCount: 0,
      label: "",
      error: "Enter page ranges like 1-5 or 1-3, 7, 9-12.",
    };
  }

  const segments = text.split(",");

  if (segments.some((segment) => segment.trim() === "")) {
    return {
      ranges: [],
      pageCount: 0,
      label: "",
      error: "Remove empty page range entries.",
    };
  }

  const ranges: PageRange[] = [];
  let selectedPageCount = 0;

  for (const segment of segments) {
    const cleanSegment = segment.trim();
    const match = cleanSegment.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      return {
        ranges: [],
        pageCount: 0,
        label: "",
        error: `Invalid range "${cleanSegment}". Use formats like 1-5 or 7.`,
      };
    }

    const start = parsePositiveInteger(match[1]);
    const end = parsePositiveInteger(match[2] || match[1]);

    if (start === null || end === null) {
      return {
        ranges: [],
        pageCount: 0,
        label: "",
        error: `Invalid range "${cleanSegment}".`,
      };
    }

    if (start < 1 || end < 1) {
      return {
        ranges: [],
        pageCount: 0,
        label: "",
        error: "Page numbers cannot be below 1.",
      };
    }

    if (start > pageCount || end > pageCount) {
      return {
        ranges: [],
        pageCount: 0,
        label: "",
        error: `Page numbers cannot be above ${pageCount}.`,
      };
    }

    if (start > end) {
      return {
        ranges: [],
        pageCount: 0,
        label: "",
        error: `Range "${cleanSegment}" is reversed. Start page must be smaller than end page.`,
      };
    }

    ranges.push(createRange(start, end));
    selectedPageCount += end - start + 1;
  }

  return {
    ranges,
    pageCount: selectedPageCount,
    label: ranges.map((range) => range.label).join(", "),
    error: "",
  };
}

function getSelectionPreview(item: MergeFileItem): SelectionPreview {
  if (item.status !== "ready" || !item.pageCount) {
    return {
      ranges: [],
      pageCount: 0,
      label: "",
      error: item.error || "This file is not ready yet.",
    };
  }

  if (item.selectionMode === "all") {
    return {
      ranges: [createRange(1, item.pageCount)],
      pageCount: item.pageCount,
      label: `All pages (${item.pageCount})`,
      error: "",
    };
  }

  return parsePageRanges(item.pageRanges, item.pageCount);
}

function getPdfReadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/encrypt|password/i.test(message)) {
    return "This PDF is password-protected and cannot be processed.";
  }

  return "This PDF could not be opened. It may be corrupted or not a valid PDF.";
}

function validateFileBeforeReading(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension !== "pdf") {
    return "Only PDF files are allowed.";
  }

  if (file.size === 0) {
    return "This PDF is empty.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "This PDF exceeds the 100 MB file size limit.";
  }

  return "";
}

export default function MergePdfUploadArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [mergeFiles, setMergeFiles] = useState<MergeFileItem[]>([]);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isAdWaiting, setIsAdWaiting] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [showGuestAd, setShowGuestAd] = useState(false);
  const [convertedFileUrl, setConvertedFileUrl] = useState("");
  const [convertedFileName, setConvertedFileName] = useState("");
  const [mergedFileSize, setMergedFileSize] = useState("");
  const [mergedPageCount, setMergedPageCount] = useState(0);

  const hasReadingFiles = mergeFiles.some((item) => item.status === "reading");

  const mergePreview = useMemo<MergePreview>(() => {
    const errors: string[] = [];
    let totalPages = 0;
    let estimatedOutputBytes = 0;

    const entries = mergeFiles.map((item, index) => {
      const selection = getSelectionPreview(item);

      if (item.status === "error") {
        errors.push(`${item.file.name}: ${item.error}`);
      } else if (item.status === "ready" && selection.error) {
        errors.push(`${item.file.name}: ${selection.error}`);
      }

      if (item.status === "ready" && item.pageCount && !selection.error) {
        totalPages += selection.pageCount;
        estimatedOutputBytes +=
          item.file.size * Math.min(selection.pageCount / item.pageCount, 1);
      }

      return {
        item,
        order: index + 1,
        selection,
      };
    });

    return {
      entries,
      errors,
      totalPages,
      estimatedOutputBytes,
    };
  }, [mergeFiles]);

  const canMerge = Boolean(
    mergeFiles.length >= 2 &&
      !hasReadingFiles &&
      !isConverting &&
      mergePreview.errors.length === 0 &&
      mergePreview.totalPages > 0
  );

  useEffect(() => {
    return () => {
      if (convertedFileUrl) {
        URL.revokeObjectURL(convertedFileUrl);
      }
    };
  }, [convertedFileUrl]);

  const resetConvertedFile = () => {
    if (convertedFileUrl) {
      URL.revokeObjectURL(convertedFileUrl);
    }

    setConvertedFileUrl("");
    setConvertedFileName("");
    setMergedFileSize("");
    setMergedPageCount(0);
  };

  const updateFileItem = (
    id: string,
    updater: (item: MergeFileItem) => MergeFileItem
  ) => {
    setMergeFiles((items) =>
      items.map((item) => (item.id === id ? updater(item) : item))
    );
  };

  const inspectPdfFile = async (item: MergeFileItem) => {
    const validationError = validateFileBeforeReading(item.file);

    if (validationError) {
      updateFileItem(item.id, (current) => ({
        ...current,
        status: "error",
        pageCount: null,
        error: validationError,
      }));
      return;
    }

    try {
      const bytes = await item.file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
      });
      const pageCount = pdf.getPageCount();

      if (pageCount < 1) {
        throw new Error("The PDF has no pages.");
      }

      updateFileItem(item.id, (current) => ({
        ...current,
        status: "ready",
        pageCount,
        error: "",
        pageRanges: pageCount > 1 ? `1-${pageCount}` : "1",
      }));
    } catch (readError) {
      console.error(readError);
      updateFileItem(item.id, (current) => ({
        ...current,
        status: "error",
        pageCount: null,
        error: getPdfReadErrorMessage(readError),
      }));
    }
  };

  const buildFileItem = (file: File): MergeFileItem => ({
    id: createItemId(),
    file,
    pageCount: null,
    status: "reading",
    error: "",
    selectionMode: "all",
    pageRanges: "1",
  });

  const addFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    resetConvertedFile();
    setIsCompleted(false);
    setIsConverting(false);
    setShowGuestAd(false);
    setProgress(0);
    setProgressMessage("");
    setError("");

    const newItems = files.map(buildFileItem);

    setMergeFiles((items) => [...items, ...newItems]);

    newItems.forEach((item) => {
      void inspectPdfFile(item);
    });
  };

  const replaceFile = (id: string, file: File) => {
    resetConvertedFile();
    setIsCompleted(false);
    setIsConverting(false);
    setShowGuestAd(false);
    setProgress(0);
    setProgressMessage("");
    setError("");

    const replacement = buildFileItem(file);

    setMergeFiles((items) =>
      items.map((item) => (item.id === id ? { ...replacement, id } : item))
    );

    void inspectPdfFile({ ...replacement, id });
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearReplaceInput = () => {
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    clearFileInput();
  };

  const handleReplaceInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (replaceFileId && file) {
      replaceFile(replaceFileId, file);
    }

    setReplaceFileId(null);
    clearReplaceInput();
  };

  const removeFile = (id: string) => {
    resetConvertedFile();
    setMergeFiles((items) => items.filter((item) => item.id !== id));
    setIsCompleted(false);
    setProgress(0);
    setProgressMessage("");
    setError("");
  };

  const resetAll = () => {
    resetConvertedFile();
    setMergeFiles([]);
    setIsCompleted(false);
    setIsConverting(false);
    setIsDraggingUpload(false);
    setDraggedFileId(null);
    setReplaceFileId(null);
    setProgress(0);
    setProgressMessage("");
    setShowGuestAd(false);
    setError("");
    clearFileInput();
    clearReplaceInput();
  };

  const moveFile = (id: string, direction: "up" | "down") => {
    resetConvertedFile();
    setMergeFiles((items) => {
      const fromIndex = items.findIndex((item) => item.id === id);

      if (fromIndex < 0) {
        return items;
      }

      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

      if (toIndex < 0 || toIndex >= items.length) {
        return items;
      }

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, movedItem);

      return nextItems;
    });
  };

  const reorderFile = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    resetConvertedFile();
    setMergeFiles((items) => {
      const fromIndex = items.findIndex((item) => item.id === draggedId);
      const toIndex = items.findIndex((item) => item.id === targetId);

      if (fromIndex < 0 || toIndex < 0) {
        return items;
      }

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, movedItem);

      return nextItems;
    });
  };

  const handleDropOnUpload = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingUpload(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleDropOnFile = (
    event: DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (draggedFileId) {
      reorderFile(draggedFileId, targetId);
    }

    setDraggedFileId(null);
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const runAdWait = async () => {
    setIsAdWaiting(true);

    for (let seconds = AD_WAIT_SECONDS; seconds > 0; seconds -= 1) {
      setAdCountdown(seconds);
      await sleep(1000);
    }

    setAdCountdown(0);
    setIsAdWaiting(false);
  };

  const readErrorMessage = async (
    response: Response,
    fallbackMessage: string
  ) => {
    try {
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const errorData = await response.json();

        if (typeof errorData?.message === "string") {
          return errorData.message;
        }

        if (typeof errorData?.error === "string") {
          return errorData.error;
        }
      }

      const text = await response.text();
      return text.trim() || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const getFilenameFromResponse = (
    response: Response,
    fallbackName: string
  ) => {
    const contentDisposition = response.headers.get("content-disposition");

    if (!contentDisposition) {
      return fallbackName;
    }

    const utf8FilenameMatch = contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

    if (utf8FilenameMatch?.[1]) {
      try {
        return decodeURIComponent(utf8FilenameMatch[1]);
      } catch {
        return utf8FilenameMatch[1];
      }
    }

    const normalFilenameMatch = contentDisposition.match(
      /filename="?([^";]+)"?/i
    );

    return normalFilenameMatch?.[1] || fallbackName;
  };

  const downloadMergedPdf = () => {
    if (!convertedFileUrl) {
      setError("Merged PDF is not available.");
      return;
    }

    const link = document.createElement("a");
    link.href = convertedFileUrl;
    link.download = convertedFileName || "DocMaster_Merged.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleContinueAfterAd = () => {
    setShowGuestAd(false);
    downloadMergedPdf();
  };

  const completeMergeConversion = async (
    blob: Blob,
    fileName: string,
    totalPages: number,
    fileCount: number
  ) => {
    if (blob.size <= 0) {
      throw new Error("The server returned an empty file.");
    }

    resetConvertedFile();

    const downloadUrl = URL.createObjectURL(blob);
    const outputSize = formatFileSize(blob.size);

    setConvertedFileUrl(downloadUrl);
    setConvertedFileName(fileName);
    setMergedFileSize(outputSize);
    setMergedPageCount(totalPages);
    setProgress(100);
    setProgressMessage("Merge completed.");
    setIsConverting(false);
    setIsCompleted(true);

    const originalFileName = mergeFiles
      .map((item, index) => `${index + 1}. ${item.file.name}`)
      .join(" | ");

    const historyResult = await saveConversionHistory({
      tool: `Merge PDF - ${fileCount} files, ${totalPages} pages, Completed`,
      originalFileName,
      outputFileName: `${fileName} (${outputSize})`,
    });

    if (!historyResult?.isAuthenticated) {
      setShowGuestAd(true);
    }
  };

  const handleMergePdf = async () => {
    if (!canMerge) {
      throw new Error(
        mergeFiles.length < 2
          ? "Please select at least two valid PDF files."
          : mergePreview.errors[0] || "Fix the PDF queue before merging."
      );
    }

    const readyItems = mergeFiles.filter((item) => item.status === "ready");
    const formData = new FormData();

    readyItems.forEach((item) => {
      formData.append("files", item.file, item.file.name);
      formData.append(
        "pageRanges",
        item.selectionMode === "all" ? "all" : item.pageRanges.trim()
      );
    });

    setProgress(25);
    setProgressMessage("Preparing files...");

    let progressTimer: number | null = null;
    let activeIndex = 0;

    progressTimer = window.setInterval(() => {
      activeIndex = (activeIndex % readyItems.length) + 1;
      setProgress((current) => Math.min(current + 7, 85));
      setProgressMessage(`Merging PDF ${activeIndex} of ${readyItems.length}...`);
    }, 700);

    const response = await (async () => {
      try {
        return await fetch("/api/pdf/merge", {
          method: "POST",
          body: formData,
          cache: "no-store",
        });
      } finally {
        if (progressTimer !== null) {
          window.clearInterval(progressTimer);
        }
      }
    })();

    setProgress(90);
    setProgressMessage("Finalizing document...");

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to merge PDFs."));
    }

    const responseBuffer = await response.arrayBuffer();

    if (responseBuffer.byteLength === 0) {
      throw new Error("The server returned an empty file.");
    }

    const contentType = response.headers.get("content-type") || "application/pdf";
    const mergedBlob = new Blob([responseBuffer], {
      type: contentType,
    });
    const fileName = getFilenameFromResponse(response, "DocMaster_Merged.pdf");
    const pageCountHeader = response.headers.get("x-merged-page-count");
    const serverPageCount = pageCountHeader ? Number(pageCountHeader) : NaN;
    const finalPageCount =
      Number.isFinite(serverPageCount) && serverPageCount > 0
        ? serverPageCount
        : mergePreview.totalPages;

    await completeMergeConversion(
      mergedBlob,
      fileName,
      finalPageCount,
      readyItems.length
    );
  };

  const handleConvert = async () => {
    if (isConverting || hasReadingFiles) {
      return;
    }

    if (mergeFiles.length < 2) {
      setError("Please select at least two valid PDF files.");
      return;
    }

    if (mergePreview.errors.length > 0) {
      setError(mergePreview.errors[0]);
      return;
    }

    setError("");
    await runAdWait();
    setIsConverting(true);
    setIsCompleted(false);
    setProgress(10);
    setProgressMessage("Preparing files...");

    try {
      await handleMergePdf();
    } catch (mergeError) {
      console.error(mergeError);
      setIsConverting(false);
      setIsCompleted(false);
      setProgress(0);
      setProgressMessage("");
      setError(
        mergeError instanceof Error
          ? mergeError.message
          : "Something went wrong during merge."
      );
    }
  };

  const renderQueue = () => (
    <div className="mt-6 space-y-3 text-left">
      {mergeFiles.map((item, index) => {
        const selection = getSelectionPreview(item);

        return (
          <div
            key={item.id}
            draggable={!isConverting}
            onDragStart={(event) => {
              setDraggedFileId(item.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => handleDropOnFile(event, item.id)}
            onDragEnd={() => setDraggedFileId(null)}
            className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
              draggedFileId === item.id
                ? "border-blue-400 opacity-70"
                : item.status === "error" || selection.error
                  ? "border-red-200"
                  : "border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3 sm:flex-1">
                <div className="mt-1 hidden cursor-grab text-gray-400 sm:block">
                  <GripVertical size={20} />
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-gray-900">
                    {item.file.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Position {index + 1}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      {formatFileSize(item.file.size)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        item.status === "ready"
                          ? "bg-green-100 text-green-700"
                          : item.status === "reading"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status === "ready"
                        ? `${item.pageCount} pages`
                        : item.status === "reading"
                          ? "Reading pages..."
                          : "Needs attention"}
                    </span>
                  </div>

                  {item.status === "ready" && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">
                          Page selection
                        </span>
                        <select
                          value={item.selectionMode}
                          onChange={(event) => {
                            const nextMode = event.target.value as PageSelectionMode;
                            updateFileItem(item.id, (current) => ({
                              ...current,
                              selectionMode: nextMode,
                            }));
                            setError("");
                            resetConvertedFile();
                          }}
                          disabled={isConverting}
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        >
                          <option value="all">Merge entire PDF</option>
                          <option value="ranges">Selected pages only</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">
                          Page ranges
                        </span>
                        <input
                          value={item.pageRanges}
                          onChange={(event) => {
                            updateFileItem(item.id, (current) => ({
                              ...current,
                              pageRanges: event.target.value,
                            }));
                            setError("");
                            resetConvertedFile();
                          }}
                          disabled={item.selectionMode === "all" || isConverting}
                          placeholder="1-5, 8, 10-12"
                          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          {item.selectionMode === "all"
                            ? "All pages from this file will be merged."
                            : selection.error || `${selection.pageCount} selected pages.`}
                        </p>
                      </label>
                    </div>
                  )}

                  {item.status === "error" && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {item.error}
                    </p>
                  )}

                  {item.status === "ready" && selection.error && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {selection.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => moveFile(item.id, "up")}
                  disabled={isConverting || index === 0}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move file up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveFile(item.id, "down")}
                  disabled={isConverting || index === mergeFiles.length - 1}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move file down"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceFileId(item.id);
                    replaceInputRef.current?.click();
                  }}
                  disabled={isConverting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  disabled={isConverting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-0"
    >
      {isAdWaiting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Sponsored Free Tool
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              Merge starts in {adCountdown}s
            </h2>
            <div className="mt-5 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              Google AdSense placement will appear here
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Free tools are supported by ads so more users can access DocMaster AI.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mergeFiles.length === 0 && !isCompleted && (
          <div
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all sm:p-10 ${
              isDraggingUpload
                ? "border-blue-600 bg-blue-50"
                : "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDraggingUpload(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDraggingUpload(false);
            }}
            onDrop={handleDropOnUpload}
          >
            <UploadCloud size={56} className="mx-auto text-blue-600" />
            <h2 className="mt-5 text-xl font-bold text-gray-950 sm:text-2xl">
              Merge PDF
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
              Upload two or more PDFs, reorder them, choose page ranges, preview
              the final order and download one merged document.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Click to browse or drag and drop PDF files here.
            </p>
            <p className="mt-5 text-xs font-medium uppercase text-gray-500 sm:text-sm">
              Supported format: .PDF - Maximum size: 100 MB per file
            </p>
          </div>
        )}

        {mergeFiles.length > 0 && !isCompleted && (
          <>
            <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">
                  Merge Queue
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Drag files to reorder them, or use the arrow buttons on mobile.
                  The merged PDF follows this order exactly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isConverting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FilePlus2 size={18} />
                Add More Files
              </button>
            </div>

            {renderQueue()}

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-950">
                    Merge Preview
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Review the file order and selected pages before merging.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    canMerge
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {canMerge ? "Ready to merge" : "Needs review"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    PDF files
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {mergeFiles.length}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Total pages
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {mergePreview.totalPages || "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Estimated output
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {mergePreview.estimatedOutputBytes > 0
                      ? formatFileSize(mergePreview.estimatedOutputBytes)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {mergePreview.entries.map(({ item, order, selection }) => (
                  <div
                    key={`preview-${item.id}`}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <span className="font-semibold text-gray-950">
                      {order}. {item.file.name}
                    </span>
                    <span className="block pt-1 text-gray-600">
                      {item.status === "ready"
                        ? selection.error || selection.label
                        : item.status === "reading"
                          ? "Reading page count..."
                          : item.error}
                    </span>
                  </div>
                ))}
              </div>

              {mergePreview.errors.length > 0 && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {mergePreview.errors[0]}
                </div>
              )}

              {mergeFiles.length < 2 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Add at least two valid PDF files to continue.
                </div>
              )}
            </div>

            {isConverting && (
              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
                <p className="mb-3 flex items-center gap-2 font-semibold text-blue-700">
                  <Loader2 size={18} className="animate-spin" />
                  {progressMessage || `Processing ${progress}%`}
                </p>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleConvert}
                disabled={!canMerge}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConverting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                {isConverting ? "Merging..." : "Merge PDFs"}
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={isConverting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={18} />
                Clear Queue
              </button>
            </div>
          </>
        )}

        {isCompleted && convertedFileUrl && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-gray-950 sm:text-3xl">
              Merge Completed
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              Your merged PDF is ready to download.
            </p>

            <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Final pages
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-950">
                  {mergedPageCount || mergePreview.totalPages}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Final size
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-950">
                  {mergedFileSize || "-"}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={downloadMergedPdf}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Download size={18} />
                Download Merged PDF
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-8 py-3 font-semibold transition hover:bg-gray-100"
              >
                <RefreshCw size={18} />
                Merge More PDFs
              </button>
            </div>
          </>
        )}
      </div>

      {showGuestAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              Advertisement
            </p>
            <div className="mt-5 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  Sponsored content will appear here.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Guest users see one advertisement after each successful merge.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleContinueAfterAd}
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Continue to Download
            </button>
            <p className="mt-3 text-xs text-gray-500">
              Create a free account to unlock account features and a better experience.
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleReplaceInputChange}
      />
    </motion.div>
  );
}
