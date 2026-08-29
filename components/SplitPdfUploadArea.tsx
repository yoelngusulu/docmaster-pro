"use client";

import { saveConversionHistory } from "@/lib/supabase/conversionHistory";
import { motion } from "framer-motion";
import JSZip from "jszip";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  FileText,
  Loader2,
  RefreshCw,
  Scissors,
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

type SplitMode =
  | "range"
  | "custom-ranges"
  | "every-n"
  | "equal-parts";

type PageRange = {
  start: number;
  end: number;
  label: string;
};

type PdfInfo = {
  pageCount: number;
  fileSizeLabel: string;
};

type SplitOutput = {
  fileName: string;
  rangeLabel: string;
  sizeLabel: string;
  url: string;
};

type SplitPreview = {
  ranges: PageRange[];
  error: string;
};

const splitModeOptions: {
  key: SplitMode;
  title: string;
  description: string;
}[] = [
  {
    key: "range",
    title: "Extract Page Range",
    description:
      "Create one PDF from a start and end page, such as 5-12.",
  },
  {
    key: "custom-ranges",
    title: "Custom Ranges",
    description:
      "Enter ranges like 1-4, 5-10, 11-20 and get one PDF per range.",
  },
  {
    key: "every-n",
    title: "Split Every N Pages",
    description:
      "Keep the current one-page split, or split every 2, 5, 10 or custom pages.",
  },
  {
    key: "equal-parts",
    title: "Split into Equal Parts",
    description:
      "Divide the document into 2, 3, 4 or more approximately equal parts.",
  },
];

const everyNOptions = [1, 2, 5, 10];
const equalPartOptions = [2, 3, 4];

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

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function createRange(start: number, end: number): PageRange {
  return {
    start,
    end,
    label: start === end ? `Page ${start}` : `Pages ${start}-${end}`,
  };
}

function validateRange(
  start: number | null,
  end: number | null,
  pageCount: number
) {
  if (start === null || end === null) {
    return "Enter both start and end page numbers.";
  }

  if (start < 1 || end < 1) {
    return "Page numbers cannot be below 1.";
  }

  if (start > pageCount || end > pageCount) {
    return `Page numbers cannot be above ${pageCount}.`;
  }

  if (start > end) {
    return "Start page cannot be greater than end page.";
  }

  return "";
}

function parseCustomRanges(
  value: string,
  pageCount: number
): SplitPreview {
  const text = value.trim();

  if (!text) {
    return {
      ranges: [],
      error: "Enter at least one page range.",
    };
  }

  const segments = text.split(",");

  if (segments.some((segment) => segment.trim() === "")) {
    return {
      ranges: [],
      error: "Remove empty custom range entries.",
    };
  }

  const ranges: PageRange[] = [];

  for (const segment of segments) {
    const cleanSegment = segment.trim();
    const match = cleanSegment.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      return {
        ranges: [],
        error: `Invalid range "${cleanSegment}". Use formats like 1-4 or 7.`,
      };
    }

    const start = parsePositiveInteger(match[1]);
    const end = parsePositiveInteger(match[2] || match[1]);
    const rangeError = validateRange(start, end, pageCount);

    if (rangeError) {
      return {
        ranges: [],
        error: `${cleanSegment}: ${rangeError}`,
      };
    }

    ranges.push(createRange(start as number, end as number));
  }

  return {
    ranges,
    error: "",
  };
}

function buildEveryNRanges(
  value: string,
  pageCount: number
): SplitPreview {
  const everyN = parsePositiveInteger(value);

  if (everyN === null) {
    return {
      ranges: [],
      error: "Enter how many pages should be placed in each PDF.",
    };
  }

  if (everyN > pageCount) {
    return {
      ranges: [],
      error: `Pages per PDF cannot be more than ${pageCount}.`,
    };
  }

  const ranges: PageRange[] = [];

  for (let start = 1; start <= pageCount; start += everyN) {
    const end = Math.min(start + everyN - 1, pageCount);
    ranges.push(createRange(start, end));
  }

  return {
    ranges,
    error: "",
  };
}

function buildEqualPartRanges(
  value: string,
  pageCount: number
): SplitPreview {
  const parts = parsePositiveInteger(value);

  if (parts === null) {
    return {
      ranges: [],
      error: "Enter how many parts you want.",
    };
  }

  if (parts < 2) {
    return {
      ranges: [],
      error: "Equal parts must be 2 or more.",
    };
  }

  if (parts > pageCount) {
    return {
      ranges: [],
      error: `Parts cannot be more than ${pageCount}.`,
    };
  }

  const ranges: PageRange[] = [];

  for (let index = 0; index < parts; index += 1) {
    const start = Math.floor((index * pageCount) / parts) + 1;
    const end = Math.floor(((index + 1) * pageCount) / parts);

    if (start <= end) {
      ranges.push(createRange(start, end));
    }
  }

  return {
    ranges,
    error: "",
  };
}

function buildSplitPreview({
  mode,
  pageCount,
  rangeStart,
  rangeEnd,
  customRanges,
  everyN,
  equalParts,
}: {
  mode: SplitMode;
  pageCount: number;
  rangeStart: string;
  rangeEnd: string;
  customRanges: string;
  everyN: string;
  equalParts: string;
}): SplitPreview {
  if (pageCount < 1) {
    return {
      ranges: [],
      error: "",
    };
  }

  if (mode === "range") {
    const start = parsePositiveInteger(rangeStart);
    const end = parsePositiveInteger(rangeEnd);
    const rangeError = validateRange(start, end, pageCount);

    if (rangeError) {
      return {
        ranges: [],
        error: rangeError,
      };
    }

    return {
      ranges: [createRange(start as number, end as number)],
      error: "",
    };
  }

  if (mode === "custom-ranges") {
    return parseCustomRanges(customRanges, pageCount);
  }

  if (mode === "equal-parts") {
    return buildEqualPartRanges(equalParts, pageCount);
  }

  return buildEveryNRanges(everyN, pageCount);
}

function getSplitModeLabel(mode: SplitMode) {
  return (
    splitModeOptions.find((option) => option.key === mode)?.title ||
    "Split PDF"
  );
}

function NumberField({
  label,
  value,
  setValue,
  min = 1,
  max,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-left">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function SplitPdfUploadArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAdWaiting, setIsAdWaiting] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [showGuestAd, setShowGuestAd] = useState(false);
  const [convertedFileUrl, setConvertedFileUrl] = useState("");
  const [convertedFileName, setConvertedFileName] = useState("");
  const [splitOutputs, setSplitOutputs] = useState<SplitOutput[]>([]);

  const [splitMode, setSplitMode] = useState<SplitMode>("every-n");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("1");
  const [customRanges, setCustomRanges] = useState("1");
  const [everyN, setEveryN] = useState("1");
  const [equalParts, setEqualParts] = useState("2");

  const splitPreview = useMemo(
    () =>
      buildSplitPreview({
        mode: splitMode,
        pageCount: pdfInfo?.pageCount || 0,
        rangeStart,
        rangeEnd,
        customRanges,
        everyN,
        equalParts,
      }),
    [
      splitMode,
      pdfInfo,
      rangeStart,
      rangeEnd,
      customRanges,
      everyN,
      equalParts,
    ]
  );

  const visiblePreviewRanges = splitPreview.ranges.slice(0, 12);
  const hiddenPreviewCount = Math.max(splitPreview.ranges.length - 12, 0);
  const canSplit = Boolean(
    selectedFile &&
      pdfInfo &&
      !isReadingPdf &&
      !isConverting &&
      !splitPreview.error &&
      splitPreview.ranges.length > 0
  );

  useEffect(() => {
    return () => {
      if (convertedFileUrl) {
        URL.revokeObjectURL(convertedFileUrl);
      }

      splitOutputs.forEach((output) => {
        URL.revokeObjectURL(output.url);
      });
    };
  }, [convertedFileUrl, splitOutputs]);

  const resetConvertedFile = () => {
    if (convertedFileUrl) {
      URL.revokeObjectURL(convertedFileUrl);
    }

    splitOutputs.forEach((output) => {
      URL.revokeObjectURL(output.url);
    });

    setConvertedFileUrl("");
    setConvertedFileName("");
    setSplitOutputs([]);
  };

  const validateFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf") {
      setError("Only PDF files are allowed.");
      return false;
    }

    if (file.size === 0) {
      setError("The uploaded PDF is empty.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Maximum file size is 100 MB.");
      return false;
    }

    return true;
  };

  const clearInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const file = files[0];

    if (!validateFile(file)) {
      clearInput();
      return;
    }

    resetConvertedFile();
    setSelectedFile(file);
    setPdfInfo(null);
    setIsCompleted(false);
    setIsConverting(false);
    setShowGuestAd(false);
    setProgress(0);
    setError("");
    setIsReadingPdf(true);

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
      });
      const pageCount = pdf.getPageCount();

      if (pageCount < 1) {
        throw new Error("The uploaded PDF has no pages.");
      }

      setPdfInfo({
        pageCount,
        fileSizeLabel: formatFileSize(file.size),
      });
      setRangeStart("1");
      setRangeEnd(String(pageCount));
      setCustomRanges(pageCount > 1 ? `1-${pageCount}` : "1");
      setEveryN("1");
      setEqualParts(pageCount >= 2 ? "2" : "1");
    } catch (readError) {
      console.error(readError);
      setSelectedFile(null);
      setPdfInfo(null);
      setError(
        readError instanceof Error
          ? readError.message
          : "The PDF could not be opened. It may be damaged or password-protected."
      );
      clearInput();
    } finally {
      setIsReadingPdf(false);
    }
  };

  const handleRemoveFile = () => {
    resetConvertedFile();
    setSelectedFile(null);
    setPdfInfo(null);
    setIsCompleted(false);
    setIsConverting(false);
    setIsDragging(false);
    setShowGuestAd(false);
    setProgress(0);
    setError("");
    setSplitMode("every-n");
    setRangeStart("1");
    setRangeEnd("1");
    setCustomRanges("1");
    setEveryN("1");
    setEqualParts("2");
    clearInput();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    void selectFiles(Array.from(event.dataTransfer.files));
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void selectFiles(Array.from(event.target.files || []));
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

  const createBlobFromResponse = async (
    response: Response,
    fallbackMimeType: string
  ) => {
    const responseBuffer = await response.arrayBuffer();

    if (responseBuffer.byteLength === 0) {
      throw new Error("The server returned an empty file.");
    }

    const contentType = response.headers.get("content-type") || fallbackMimeType;

    return new Blob([responseBuffer], {
      type: contentType,
    });
  };

  const downloadUrl = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadAll = () => {
    if (!convertedFileUrl) {
      setError("Split output is not available.");
      return;
    }

    downloadUrl(convertedFileUrl, convertedFileName || "split-pdf-output.zip");
  };

  const handleContinueAfterAd = () => {
    setShowGuestAd(false);
    handleDownloadAll();
  };

  const createSplitOutputLinks = async (
    blob: Blob,
    contentType: string,
    fileName: string
  ) => {
    if (contentType.includes("application/zip") || fileName.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(blob);
      const entries = Object.values(zip.files)
        .filter(
          (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".pdf")
        )
        .sort((first, second) =>
          first.name.localeCompare(second.name, undefined, {
            numeric: true,
          })
        );

      if (entries.length === 0) {
        throw new Error("The split ZIP did not contain PDF files.");
      }

      return Promise.all(
        entries.map(async (entry, index) => {
          const outputBlob = await entry.async("blob");
          const outputFileName = entry.name.split("/").pop() || entry.name;

          return {
            fileName: outputFileName,
            rangeLabel: splitPreview.ranges[index]?.label || `Part ${index + 1}`,
            sizeLabel: formatFileSize(outputBlob.size),
            url: URL.createObjectURL(outputBlob),
          };
        })
      );
    }

    const pdfBlob = new Blob([blob], {
      type: "application/pdf",
    });

    return [
      {
        fileName,
        rangeLabel: splitPreview.ranges[0]?.label || "Selected pages",
        sizeLabel: formatFileSize(pdfBlob.size),
        url: URL.createObjectURL(pdfBlob),
      },
    ];
  };

  const completeSplitConversion = async (
    blob: Blob,
    fileName: string,
    outputs: SplitOutput[]
  ) => {
    resetConvertedFile();

    const downloadAllUrl = URL.createObjectURL(blob);

    setConvertedFileUrl(downloadAllUrl);
    setConvertedFileName(fileName);
    setSplitOutputs(outputs);
    setProgress(100);
    setIsConverting(false);
    setIsCompleted(true);

    const historyResult = await saveConversionHistory({
      tool: `Split PDF - ${getSplitModeLabel(splitMode)}`,
      originalFileName: selectedFile?.name || "Unknown PDF",
      outputFileName: fileName,
    });

    if (!historyResult?.isAuthenticated) {
      setShowGuestAd(true);
    }
  };

  const handleSplitPdf = async () => {
    if (!selectedFile) {
      throw new Error("Please select one PDF file.");
    }

    if (!pdfInfo) {
      throw new Error("Please wait until the page count is detected.");
    }

    if (splitPreview.error || splitPreview.ranges.length === 0) {
      throw new Error(splitPreview.error || "Choose a valid split range.");
    }

    const formData = new FormData();

    formData.append("file", selectedFile, selectedFile.name);
    formData.append("splitMode", splitMode);
    formData.append("rangeStart", rangeStart);
    formData.append("rangeEnd", rangeEnd);
    formData.append("customRanges", customRanges);
    formData.append("everyN", everyN);
    formData.append("equalParts", equalParts);

    setProgress(35);

    const response = await fetch("/api/pdf/split", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    setProgress(75);

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to split the PDF.")
      );
    }

    const responseContentType = response.headers.get("content-type") || "";
    const fallbackName =
      splitPreview.ranges.length === 1
        ? `${selectedFile.name.replace(/\.pdf$/i, "")}-split.pdf`
        : `${selectedFile.name.replace(/\.pdf$/i, "")}-split.zip`;
    const fileName = getFilenameFromResponse(response, fallbackName);
    const splitBlob = await createBlobFromResponse(
      response,
      splitPreview.ranges.length === 1 ? "application/pdf" : "application/zip"
    );
    const outputs = await createSplitOutputLinks(
      splitBlob,
      responseContentType || splitBlob.type,
      fileName
    );

    await completeSplitConversion(splitBlob, fileName, outputs);
  };

  const handleConvert = async () => {
    if (isConverting || isReadingPdf) {
      return;
    }

    if (!selectedFile) {
      setError("Please select one PDF file.");
      return;
    }

    if (!pdfInfo) {
      setError("Please wait until the page count is detected.");
      return;
    }

    if (splitPreview.error) {
      setError(splitPreview.error);
      return;
    }

    setError("");
    await runAdWait();
    setIsConverting(true);
    setIsCompleted(false);
    setProgress(10);

    try {
      await handleSplitPdf();
    } catch (conversionError) {
      console.error(conversionError);
      setIsConverting(false);
      setIsCompleted(false);
      setProgress(0);
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Something went wrong during conversion."
      );
    }
  };

  const renderSplitFields = () => {
    if (!pdfInfo) {
      return null;
    }

    if (splitMode === "range") {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Start page"
            value={rangeStart}
            setValue={setRangeStart}
            max={pdfInfo.pageCount}
          />
          <NumberField
            label="End page"
            value={rangeEnd}
            setValue={setRangeEnd}
            max={pdfInfo.pageCount}
          />
        </div>
      );
    }

    if (splitMode === "custom-ranges") {
      return (
        <label className="block text-left">
          <span className="text-sm font-semibold text-gray-700">
            Custom page ranges
          </span>
          <input
            value={customRanges}
            onChange={(event) => setCustomRanges(event.target.value)}
            placeholder="1-4, 5-10, 11-20"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      );
    }

    if (splitMode === "equal-parts") {
      return (
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-700">Number of parts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {equalPartOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEqualParts(String(option))}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  equalParts === String(option)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <NumberField
              label="Custom parts"
              value={equalParts}
              setValue={setEqualParts}
              min={2}
              max={pdfInfo.pageCount}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="text-left">
        <p className="text-sm font-semibold text-gray-700">Pages per PDF</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {everyNOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEveryN(String(option))}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                everyN === String(option)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-xs">
          <NumberField
            label="Custom pages per PDF"
            value={everyN}
            setValue={setEveryN}
            max={pdfInfo.pageCount}
          />
        </div>
      </div>
    );
  };

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
              Split starts in {adCountdown}s
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

        {!selectedFile && !isCompleted && (
          <div
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all sm:p-10 ${
              isDragging
                ? "border-blue-600 bg-blue-50"
                : "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <UploadCloud size={56} className="mx-auto text-blue-600" />
            <h2 className="mt-5 text-xl font-bold text-gray-950 sm:text-2xl">
              Split PDF
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
              Upload one PDF, choose how it should be split, preview the ranges,
              then download each output or the full ZIP.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Click to browse or drag and drop your PDF here.
            </p>
            <p className="mt-5 text-xs font-medium uppercase text-gray-500 sm:text-sm">
              Supported format: .PDF - Maximum size: 100 MB
            </p>
          </div>
        )}

        {selectedFile && !isCompleted && (
          <>
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">
                Selected PDF
              </h2>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText size={22} className="mt-0.5 shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-gray-900">
                      {selectedFile.name}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          File size
                        </p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {pdfInfo?.fileSizeLabel || formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Total pages
                        </p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {isReadingPdf ? "Reading..." : pdfInfo?.pageCount || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {pdfInfo && (
              <div className="mt-6 text-left">
                <h3 className="text-lg font-bold text-gray-950">Split mode</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {splitModeOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={splitMode === option.key}
                      onClick={() => {
                        setSplitMode(option.key);
                        setError("");
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        splitMode === option.key
                          ? "border-blue-600 bg-blue-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <span className="font-bold text-gray-950">{option.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-gray-600">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                  {renderSplitFields()}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-950">Preview</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {splitPreview.error
                          ? splitPreview.error
                          : `${splitPreview.ranges.length} output file${
                              splitPreview.ranges.length === 1 ? "" : "s"
                            } will be created.`}
                      </p>
                    </div>
                    {!splitPreview.error && splitPreview.ranges.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                        {getSplitModeLabel(splitMode)}
                      </span>
                    )}
                  </div>

                  {!splitPreview.error && splitPreview.ranges.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {visiblePreviewRanges.map((range, index) => (
                        <div
                          key={`${range.start}-${range.end}-${index}`}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                        >
                          Part {index + 1}: {range.label}
                        </div>
                      ))}
                      {hiddenPreviewCount > 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500">
                          + {hiddenPreviewCount} more range
                          {hiddenPreviewCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isConverting && (
              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
                <p className="mb-3 flex items-center gap-2 font-semibold text-blue-700">
                  <Loader2 size={18} className="animate-spin" />
                  Processing {progress}%
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
                disabled={!canSplit}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConverting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Scissors size={18} />
                )}
                {isConverting ? "Splitting..." : "Split PDF"}
              </button>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isConverting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={18} />
                Remove File
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
              Split Completed
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              {splitOutputs.length === 1
                ? "Your selected PDF pages are ready."
                : `Your PDF was split into ${splitOutputs.length} files.`}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleDownloadAll}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                {splitOutputs.length > 1 ? (
                  <FileArchive size={18} />
                ) : (
                  <Download size={18} />
                )}
                {splitOutputs.length > 1 ? "Download All as ZIP" : "Download PDF"}
              </button>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-8 py-3 font-semibold transition hover:bg-gray-100"
              >
                <RefreshCw size={18} />
                Split Another PDF
              </button>
            </div>

            {splitOutputs.length > 0 && (
              <div className="mt-8 text-left">
                <h3 className="text-lg font-bold text-gray-950">
                  Result files
                </h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                  {splitOutputs.map((output, index) => (
                    <div
                      key={`${output.fileName}-${index}`}
                      className="flex flex-col gap-3 border-b border-gray-100 bg-white p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-gray-900">
                          {output.fileName}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {output.rangeLabel} - {output.sizeLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadUrl(output.url, output.fileName)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  Guest users see one advertisement after each successful split.
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
        className="hidden"
        onChange={handleFileInputChange}
      />
    </motion.div>
  );
}
