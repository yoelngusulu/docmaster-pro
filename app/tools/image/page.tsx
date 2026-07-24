import Link from "next/link";

const imageTools = [
  {
    title: "JPG to PNG",
    href: "/tools/image/jpg-to-png",
    icon: "🖼️",
  },
  {
    title: "PNG to JPG",
    href: "/tools/image/png-to-jpg",
    icon: "🌄",
  },
  {
    title: "WEBP to JPG",
    href: "/tools/image/webp-to-jpg",
    icon: "📷",
  },
  {
    title: "JPG to WEBP",
    href: "/tools/image/jpg-to-webp",
    icon: "⚡",
  },
  {
    title: "PNG to WEBP",
    href: "/tools/image/png-to-webp",
    icon: "🎯",
  },
  {
    title: "WEBP to PNG",
    href: "/tools/image/webp-to-png",
    icon: "🖌️",
  },
];

export default function ImageToolsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center text-4xl font-bold">
        Image Tools
      </h1>

      <p className="mt-4 text-center text-gray-600">
        Convert images between popular formats.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {imageTools.map((tool) => (
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