"use client";

import { toolConfig } from "./toolConfig";
import {
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type UploadAreaProps = {
  tool: keyof typeof toolConfig;
};

export default function UploadArea({
  tool,
}: UploadAreaProps) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const config = toolConfig[tool];

  const [error, setError] =
    useState("");

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>([]);

  const [
    isConverting,
    setIsConverting,
  ] = useState(false);

  const [progress, setProgress] =
    useState(0);

  const [
    isCompleted,
    setIsCompleted,
  ] = useState(false);

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const [
    selectedAction,
    setSelectedAction,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    convertedFileUrl,
    setConvertedFileUrl,
  ] = useState("");

  const [
    convertedFileName,
    setConvertedFileName,
  ] = useState("");

  const aiActions = [
    "Remove Background",
    "Enhance",
    "Colorize",
    "Face Retouch",
    "Upscale",
    "Remove Object",
    "Change Background",
    "Color Correction",
  ];

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      if (convertedFileUrl) {
        URL.revokeObjectURL(
          convertedFileUrl
        );
      }
    };
  }, [
    previewUrl,
    convertedFileUrl,
  ]);

  const validateFiles = (
    files: File[]
  ) => {
    const maxSize =
      100 * 1024 * 1024;

    const allowedExtensions =
      config.accept
        .split(",")
        .map((extension) =>
          extension
            .replace(".", "")
            .trim()
            .toLowerCase()
        );

    for (const file of files) {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase();

      if (
        !allowedExtensions.includes(
          extension || ""
        )
      ) {
        setError(
          `Only ${allowedExtensions
            .map((item) =>
              item.toUpperCase()
            )
            .join(", ")} files are allowed.`
        );

        return false;
      }

      if (file.size > maxSize) {
        setError(
          "Maximum file size is 100 MB."
        );

        return false;
      }
    }

    setError("");

    return true;
  };

  const resetConvertedFile = () => {
    if (convertedFileUrl) {
      URL.revokeObjectURL(
        convertedFileUrl
      );
    }

    setConvertedFileUrl("");
    setConvertedFileName("");
  };

  const createImagePreview = (
    file: File
  ) => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    if (
      file.type.startsWith("image/")
    ) {
      setPreviewUrl(
        URL.createObjectURL(file)
      );
    } else {
      setPreviewUrl("");
    }
  };

  const selectFiles = (
    files: File[]
  ) => {
    if (files.length === 0) {
      return;
    }

    if (!validateFiles(files)) {
      return;
    }

    const acceptedFiles =
      config.multiple
        ? files
        : [files[0]];

    setSelectedFiles(
      acceptedFiles
    );

    if (acceptedFiles[0]) {
      createImagePreview(
        acceptedFiles[0]
      );
    }

    resetConvertedFile();

    setProgress(0);
    setIsCompleted(false);
    setIsConverting(false);
    setSelectedAction("");
    setError("");
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    resetConvertedFile();

    setSelectedFiles([]);
    setProgress(0);
    setIsCompleted(false);
    setIsConverting(false);
    setIsDragging(false);
    setSelectedAction("");
    setPassword("");
    setConfirmPassword("");
    setPreviewUrl("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };

  const handleDownload = () => {
    if (!convertedFileUrl) {
      setError(
        "Converted file is not available."
      );

      return;
    }

    const link =
      document.createElement("a");

    link.href =
      convertedFileUrl;

    link.download =
      convertedFileName ||
      "Converted_Document";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const files = Array.from(
      event.dataTransfer.files
    );

    selectFiles(files);
  };

  const readErrorMessage =
    async (
      response: Response,
      fallbackMessage: string
    ) => {
      try {
        const contentType =
          response.headers.get(
            "content-type"
          );

        if (
          contentType?.includes(
            "application/json"
          )
        ) {
          const errorData =
            await response.json();

          if (
            typeof errorData?.message ===
            "string"
          ) {
            return errorData.message;
          }

          if (
            typeof errorData?.error ===
            "string"
          ) {
            return errorData.error;
          }
        }

        const text =
          await response.text();

        return (
          text.trim() ||
          fallbackMessage
        );
      } catch {
        return fallbackMessage;
      }
    };

  const getFilenameFromResponse = (
    response: Response,
    fallbackName: string
  ) => {
    const contentDisposition =
      response.headers.get(
        "content-disposition"
      );

    if (!contentDisposition) {
      return fallbackName;
    }

    const utf8FilenameMatch =
      contentDisposition.match(
        /filename\*=UTF-8''([^;]+)/i
      );

    if (utf8FilenameMatch?.[1]) {
      try {
        return decodeURIComponent(
          utf8FilenameMatch[1]
        );
      } catch {
        return utf8FilenameMatch[1];
      }
    }

    const normalFilenameMatch =
      contentDisposition.match(
        /filename="?([^";]+)"?/i
      );

    return (
      normalFilenameMatch?.[1] ||
      fallbackName
    );
  };

  const completeConversion = (
    blob: Blob,
    fileName: string
  ) => {
    if (blob.size <= 0) {
      throw new Error(
        "The server returned an empty file."
      );
    }

    resetConvertedFile();

    const downloadUrl =
      URL.createObjectURL(blob);

    setConvertedFileUrl(
      downloadUrl
    );

    setConvertedFileName(
      fileName
    );

    setProgress(100);
    setIsConverting(false);
    setIsCompleted(true);
  };

  const createBlobFromResponse =
    async (
      response: Response,
      fallbackMimeType: string
    ) => {
      const responseBuffer =
        await response.arrayBuffer();

      if (
        responseBuffer.byteLength === 0
      ) {
        throw new Error(
          "The server returned an empty file."
        );
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) || fallbackMimeType;

      return new Blob(
        [responseBuffer],
        {
          type: contentType,
        }
      );
    };

  const handleWordToPdf =
    async () => {
      if (
        selectedFiles.length !== 1
      ) {
        throw new Error(
          "Please select one Word file."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFiles[0]
      );

      setProgress(35);

      const response = await fetch(
        "/api/convert/word-to-pdf",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Word to PDF conversion failed."
          )
        );
      }

      const convertedBlob =
        await createBlobFromResponse(
          response,
          "application/pdf"
        );

      const fallbackName =
        selectedFiles[0].name.replace(
          /\.(doc|docx)$/i,
          ".pdf"
        );

      const fileName =
        getFilenameFromResponse(
          response,
          fallbackName
        );

      completeConversion(
        convertedBlob,
        fileName
      );
    };

  const handleMergePdf =
    async () => {
      if (
        selectedFiles.length < 2
      ) {
        throw new Error(
          "Please select at least two PDF files."
        );
      }

      const formData =
        new FormData();

      selectedFiles.forEach(
        (file) => {
          formData.append(
            "files",
            file
          );
        }
      );

      setProgress(35);

      const response = await fetch(
        "/api/pdf/merge",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to merge PDFs."
          )
        );
      }

      const mergedBlob =
        await createBlobFromResponse(
          response,
          "application/pdf"
        );

      const fileName =
        getFilenameFromResponse(
          response,
          "Merged.pdf"
        );

      completeConversion(
        mergedBlob,
        fileName
      );
    };

  const handleSplitPdf =
    async () => {
      if (
        selectedFiles.length !== 1
      ) {
        throw new Error(
          "Please select one PDF file."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFiles[0],
        selectedFiles[0].name
      );

      setProgress(35);

      const response = await fetch(
        "/api/pdf/split",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to split the PDF."
          )
        );
      }

      const splitZipBlob =
        await createBlobFromResponse(
          response,
          "application/zip"
        );

      const originalName =
        selectedFiles[0].name.replace(
          /\.pdf$/i,
          ""
        );

      const fileName =
        getFilenameFromResponse(
          response,
          `${originalName}-split-pages.zip`
        );

      completeConversion(
        splitZipBlob,
        fileName
      );
    };
  const handleCompressPdf =
    async () => {
      if (
        selectedFiles.length !== 1
      ) {
        throw new Error(
          "Please select one PDF file."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFiles[0],
        selectedFiles[0].name
      );

      setProgress(35);

      const response = await fetch(
        "/api/pdf/compress",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to compress the PDF."
          )
        );
      }

      const compressedBlob =
        await createBlobFromResponse(
          response,
          "application/pdf"
        );

      const originalName =
        selectedFiles[0].name.replace(
          /\.pdf$/i,
          ""
        );

      const fileName =
        getFilenameFromResponse(
          response,
          `${originalName}-compressed.pdf`
        );

      completeConversion(
        compressedBlob,
        fileName
      );
    };

  const handleProtectPdf =
    async () => {
      if (
        selectedFiles.length !== 1
      ) {
        throw new Error(
          "Please select one PDF file."
        );
      }

      const cleanPassword =
        password.trim();

      if (cleanPassword.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (
        cleanPassword !==
        confirmPassword.trim()
      ) {
        throw new Error(
          "Passwords do not match."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFiles[0],
        selectedFiles[0].name
      );

      formData.append(
        "password",
        cleanPassword
      );

      setProgress(35);

      const response = await fetch(
        "/api/pdf/protect",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to protect the PDF."
          )
        );
      }

      const protectedBlob =
        await createBlobFromResponse(
          response,
          "application/pdf"
        );

      const originalName =
        selectedFiles[0].name.replace(
          /\.pdf$/i,
          ""
        );

      const fileName =
        getFilenameFromResponse(
          response,
          `${originalName}-protected.pdf`
        );

      completeConversion(
        protectedBlob,
        fileName
      );
    };


const handlePdfToWord = async () => {
  if (selectedFiles.length !== 1) {
    throw new Error(
      "Please select one PDF file."
    );
  }

  const formData = new FormData();

  formData.append(
    "file",
    selectedFiles[0],
    selectedFiles[0].name
  );

  setProgress(35);

  const response = await fetch(
    "/api/convert/pdf-to-word",
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  setProgress(75);

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Unable to convert PDF to Word."
      )
    );
  }

  const convertedBlob =
    await createBlobFromResponse(
      response,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

  const originalName =
    selectedFiles[0].name.replace(
      /\.pdf$/i,
      ""
    );

  const fileName =
    getFilenameFromResponse(
      response,
      `${originalName}.docx`
    );

  completeConversion(
    convertedBlob,
    fileName
  );
};

const handleUnlockPdf =
    async () => {
      if (selectedFiles.length !== 1) {
        throw new Error(
          "Please select one PDF file."
        );
      }

      const cleanPassword = password.trim();

      if (!cleanPassword) {
        throw new Error(
          "Please enter the PDF password."
        );
      }
      

      const formData = new FormData();

      formData.append(
        "file",
        selectedFiles[0],
        selectedFiles[0].name
      );

      formData.append(
        "password",
        cleanPassword
      );

      setProgress(35);

      const response = await fetch(
        "/api/pdf/unlock",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      setProgress(75);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to unlock the PDF."
          )
        );
      }

      const unlockedBlob =
        await createBlobFromResponse(
          response,
          "application/pdf"
        );

      const originalName =
        selectedFiles[0].name.replace(
          /\.pdf$/i,
          ""
        );

      const fileName =
        getFilenameFromResponse(
          response,
          `${originalName}-unlocked.pdf`
        );

      completeConversion(
        unlockedBlob,
        fileName
      );
    };

  const handleSimulation =
    async () => {
      const response = await fetch(
        "/api/convert",
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Conversion request failed."
        );
      }

      await response.json();

      const interval =
        window.setInterval(() => {
          setProgress(
            (previousProgress) => {
              const nextProgress =
                Math.min(
                  previousProgress +
                    20,
                  100
                );

              if (
                nextProgress >= 100
              ) {
                window.clearInterval(
                  interval
                );

                setIsConverting(
                  false
                );

                setIsCompleted(
                  true
                );
              }

              return nextProgress;
            }
          );
        }, 600);
    };

  const handleConvert =
    async () => {
      if (isConverting) {
        return;
      }

      if (
        selectedFiles.length === 0
      ) {
        setError(
          "Please select a file."
        );

        return;
      }

      if (
        tool === "merge-pdf" &&
        selectedFiles.length < 2
      ) {
        setError(
          "Please select at least two PDF files."
        );

        return;
      }

      if (
        tool === "split-pdf" &&
        selectedFiles.length !== 1
      ) {
        setError(
          "Please select one PDF file."
        );

        return;
      }

      if (
        tool === "compress-pdf" &&
        selectedFiles.length !== 1
      ) {
        setError(
          "Please select one PDF file."
        );

        return;
      }

      if (
        tool === "protect-pdf" &&
        selectedFiles.length !== 1
      ) {
        setError(
          "Please select one PDF file."
        );

        return;
      }

      if (
        tool === "protect-pdf" &&
        password.trim().length < 6
      ) {
        setError(
          "Password must contain at least 6 characters."
        );

        return;
      }

      if (
        tool === "protect-pdf" &&
        password.trim() !==
          confirmPassword.trim()
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }

      if (
        tool === "unlock-pdf" &&
        selectedFiles.length !== 1
      ) {
        setError(
          "Please select one PDF file."
        );

        return;
      }

      if (
        tool === "unlock-pdf" &&
        !password.trim()
      ) {
        setError(
          "Please enter the PDF password."
        );

        return;
      }

      if (
        tool === "pdf-to-word" &&
        selectedFiles.length !== 1
      ) {
        setError(
          "Please select one PDF file."
        );

        return;
      }

      if (
        tool === "image-editor" &&
        !selectedAction
      ) {
        setError(
          "Please select an AI editing option."
        );

        return;
      }

      setError("");
      setIsConverting(true);
      setIsCompleted(false);
      setProgress(10);

      try {
        if (
          tool === "pdf-to-word"
        ) {
          await handlePdfToWord();

          return;
        }

        if (
          tool === "word-to-pdf"
        ) {
          await handleWordToPdf();

          return;
        }

        if (
          tool === "merge-pdf"
        ) {
          await handleMergePdf();

          return;
        }

        if (
          tool === "split-pdf"
        ) {
          await handleSplitPdf();

          return;
        }

        if (
          tool === "compress-pdf"
        ) {
          await handleCompressPdf();

          return;
        }

        if (
          tool === "protect-pdf"
        ) {
          await handleProtectPdf();

          return;
        }

        if (
          tool === "unlock-pdf"
        ) {
          await handleUnlockPdf();

          return;
        }

        await handleSimulation();
      } catch (
        conversionError
      ) {
        console.error(
          conversionError
        );

        setIsConverting(false);
        setIsCompleted(false);
        setProgress(0);

        setError(
          conversionError instanceof
            Error
            ? conversionError.message
            : "Something went wrong during conversion."
        );
      }
    };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 25,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
      }}
      className="mt-10"
    >
      <div className="rounded-3xl border-2 border-dashed border-blue-300 bg-white p-12 text-center transition-all hover:border-blue-500 hover:bg-blue-50">
        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {selectedFiles.length ===
          0 &&
          !isCompleted && (
            <div
              className={`cursor-pointer rounded-2xl p-4 transition-all ${
                isDragging
                  ? "border-2 border-blue-600 bg-blue-100"
                  : ""
              }`}
              onClick={() =>
                fileInputRef.current?.click()
              }
              onDragOver={(
                event
              ) => {
                event.preventDefault();
                event.stopPropagation();

                setIsDragging(
                  true
                );
              }}
              onDragLeave={(
                event
              ) => {
                event.preventDefault();
                event.stopPropagation();

                setIsDragging(
                  false
                );
              }}
              onDrop={handleDrop}
            >
              <UploadCloud
                size={70}
                className="mx-auto text-blue-600"
              />

              <h2 className="mt-6 text-2xl font-bold">
                {config.title}
              </h2>

              <p className="mt-3 text-gray-600">
                {config.subtitle}
              </p>

              <p className="mt-4 text-gray-500">
                Click to browse or drag
                and drop your file here.
              </p>

              <p className="mt-6 text-sm text-gray-500">
                Supported format:{" "}
                {config.accept.toUpperCase()}{" "}
                • Maximum size: 100 MB
              </p>

              {tool ===
                "merge-pdf" && (
                <p className="mt-2 text-sm font-medium text-blue-600">
                  Select at least two
                  PDF files.
                </p>
              )}

              {tool ===
                "split-pdf" && (
                <p className="mt-2 text-sm font-medium text-blue-600">
                  Select one PDF file.
                </p>
              )}

              {tool ===
                "compress-pdf" && (
                <p className="mt-2 text-sm font-medium text-blue-600">
                  Select one PDF file.
                </p>
              )}
            </div>
          )}

        {selectedFiles.length >
          0 &&
          !isCompleted && (
            <>
              <h2 className="text-2xl font-bold text-green-700">
                Selected File
                {selectedFiles.length >
                1
                  ? "s"
                  : ""}
              </h2>

              {previewUrl && (
                <div className="mt-6">
                  <img
                    src={previewUrl}
                    alt="Selected image preview"
                    className="mx-auto max-h-80 max-w-full rounded-2xl border border-gray-200 object-contain shadow-md"
                  />
                </div>
              )}

              {tool ===
                "image-editor" && (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {aiActions.map(
                      (action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => {
                            setSelectedAction(
                              action
                            );

                            setError(
                              ""
                            );
                          }}
                          className={`rounded-xl border p-3 transition ${
                            selectedAction ===
                            action
                              ? "border-blue-600 bg-blue-100 text-blue-700"
                              : "border-gray-300 hover:bg-blue-50"
                          }`}
                        >
                          {action}
                        </button>
                      )
                    )}
                  </div>

                  {selectedAction ? (
                    <p className="mt-4 font-medium text-blue-700">
                      Selected action:{" "}
                      {selectedAction}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-red-500">
                      Please select an
                      AI editing option
                      before continuing.
                    </p>
                  )}
                </>
              )}

              {(tool ===
                "protect-pdf" ||
                tool ===
                  "unlock-pdf") && (
                <div className="mx-auto mt-6 max-w-xl space-y-4 text-left">
                  <div>
                    <label
                      htmlFor="protect-password"
                      className="mb-2 block font-semibold text-gray-700"
                    >
                      Password
                    </label>

                    <input
                      id="protect-password"
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value
                        );

                        setError("");
                      }}
                      placeholder="Enter a password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {tool ===
                    "protect-pdf" && (
                    <div>
                    <label
                      htmlFor="protect-confirm-password"
                      className="mb-2 block font-semibold text-gray-700"
                    >
                      Confirm Password
                    </label>

                    <input
                      id="protect-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(
                          event.target.value
                        );

                        setError("");
                      }}
                      placeholder="Confirm the password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  )}

                  {tool ===
                    "protect-pdf" && (
                    <p className="text-sm text-gray-500">
                      Use at least 6 characters.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-3">
                {selectedFiles.map(
                  (
                    file,
                    index
                  ) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="font-medium text-gray-800">
                        📄{" "}
                        {file.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {(
                          file.size /
                          (1024 *
                            1024)
                        ).toFixed(
                          2
                        )}{" "}
                        MB
                      </p>
                    </div>
                  )
                )}
              </div>

              {tool ===
                "merge-pdf" &&
                selectedFiles.length <
                  2 && (
                  <p className="mt-4 text-sm font-medium text-red-500">
                    Add at least one
                    more PDF file.
                  </p>
                )}

              {isConverting && (
                <div className="mt-6">
                  <p className="mb-2 font-semibold text-blue-600">
                    Progress:{" "}
                    {progress}%
                  </p>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={
                    handleConvert
                  }
                  disabled={
                    isConverting ||
                    (tool ===
                      "image-editor" &&
                      !selectedAction) ||
                    (tool ===
                      "merge-pdf" &&
                      selectedFiles.length <
                        2) ||
                    (tool ===
                      "protect-pdf" &&
                      (password.trim().length <
                        6 ||
                        password.trim() !==
                          confirmPassword.trim())) ||
                    (tool ===
                      "unlock-pdf" &&
                      !password.trim())
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConverting && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {isConverting
                    ? tool ===
                      "protect-pdf"
                      ? "Protecting..."
                      : tool ===
                          "unlock-pdf"
                        ? "Unlocking..."
                        : "Converting..."
                    : config.button}
                </button>

                <button
                  type="button"
                  onClick={
                    handleRemoveFile
                  }
                  disabled={
                    isConverting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2
                    size={18}
                  />

                  Remove File
                </button>
              </div>
            </>
          )}

        {isCompleted &&
          convertedFileUrl && (
            <>
              <h2 className="text-3xl font-bold text-green-700">
                ✅ Conversion
                Completed!
              </h2>

              <p className="mt-4 text-gray-600">
                {config.success}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={
                    handleDownload
                  }
                  className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  ⬇ Download File
                </button>

                <button
                  type="button"
                  onClick={
                    handleRemoveFile
                  }
                  className="rounded-xl border border-gray-300 px-8 py-3 font-semibold transition hover:bg-gray-100"
                >
                  🔄 Convert Another
                  File
                </button>
              </div>
            </>
          )}

        {isCompleted &&
          !convertedFileUrl && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-700">
              This tool is still in
              simulation mode. No
              downloadable file was
              created.
            </div>
          )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        multiple={
          config.multiple
        }
        className="hidden"
        onChange={(event) => {
          const files =
            Array.from(
              event.target.files ||
                []
            );

          selectFiles(files);
        }}
      />
    </motion.div>
  );
}