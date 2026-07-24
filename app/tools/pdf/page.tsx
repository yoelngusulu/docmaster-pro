import Link from "next/link";
import PDFToolsGrid from "@/components/PDFToolsGrid";

export default function PDFToolsPage() {
  return (
    <main className="min-h-screen bg-gray-50">

      <div className="mx-auto max-w-7xl px-6 py-8">

        <Link
          href="/"
          className="text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>

        <PDFToolsGrid />

      </div>

    </main>
  );
}