import Link from "next/link";

const officeTools = [
  {
    title: "Word to PDF",
    href: "/tools/office/word-to-pdf",
    icon: "📝",
  },
  {
    title: "Excel to PDF",
    href: "/tools/office/excel-to-pdf",
    icon: "📊",
  },
  {
    title: "PowerPoint to PDF",
    href: "/tools/office/powerpoint-to-pdf",
    icon: "📽️",
  },
];

export default function OfficeToolsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center text-4xl font-bold">
        Office Tools
      </h1>

      <p className="mt-4 text-center text-gray-600">
        Convert Word, Excel and PowerPoint files easily.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {officeTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border p-8 text-center transition hover:border-blue-500 hover:shadow-lg"
          >
            <div className="text-5xl">{tool.icon}</div>

            <h2 className="mt-5 text-xl font-semibold">
              {tool.title}
            </h2>
          </Link>
        ))}
      </div>
    </main>
  );
}