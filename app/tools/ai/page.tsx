import Link from "next/link";

const aiTools = [
  {
    title: "AI Image Editor",
    href: "/tools/ai/image-editor",
    icon: "🎨",
  },
  {
    title: "Background Remover",
    href: "/tools/ai/background-remover",
    icon: "✂️",
  },
  {
    title: "Photo Enhancer",
    href: "/tools/ai/photo-enhancer",
    icon: "✨",
  },
  {
    title: "Object Remover",
    href: "/tools/ai/object-remover",
    icon: "🪄",
  },
  {
    title: "Face Retouch",
    href: "/tools/ai/face-retouch",
    icon: "👤",
  },
  {
    title: "Image Upscaler",
    href: "/tools/ai/image-upscaler",
    icon: "📈",
  },
  {
    title: "Image Colorizer",
    href: "/tools/ai/image-colorizer",
    icon: "🌈",
  },
  {
    title: "Image to Text (OCR)",
    href: "/tools/ai/image-to-text",
    icon: "📝",
  },
];

export default function AIToolsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center text-4xl font-bold">
        AI Tools
      </h1>

      <p className="mt-4 text-center text-gray-600">
        Powerful AI tools for editing, enhancing and transforming images.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {aiTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border bg-white p-8 text-center transition hover:border-blue-500 hover:shadow-xl"
          >
            <div className="text-5xl">
              {tool.icon}
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              {tool.title}
            </h2>
          </Link>
        ))}
      </div>
    </main>
  );
}