import Link from "next/link";
import UploadArea from "@/components/UploadArea";

export default function UnlockPDFPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/tools/pdf"
          className="text-blue-600 hover:underline"
        >
          ← Back to PDF Tools
        </Link>

        <h1 className="mt-6 text-5xl font-bold">
          Unlock PDF
        </h1>

        <p className="mt-4 text-gray-600">
          Unlock password-protected PDF documents.
        </p>

        <UploadArea tool="unlock-pdf" />
      </div>
    </main>
  );
}