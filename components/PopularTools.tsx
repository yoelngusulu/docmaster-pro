import Link from "next/link";

export default function PopularTools() {
  const tools = [
    { label: "Coordinates Converter", href: "/tools/coordinates-converter" },
    { label: "Measure Distance & Area", href: "/tools/gis/distance-area-calculator" },
    { label: "Water Storage & Tank Sizing", href: "/tools/gis/water-storage-calculator" },
    { label: "Merge PDF", href: "/tools/pdf/merge-pdf" },
    { label: "Split PDF", href: "/tools/pdf/split-pdf" },
    { label: "Compress PDF", href: "/tools/pdf/compress-pdf" },
    { label: "Image to PDF", href: "/tools/image/image-to-pdf" },
    { label: "Bearing & Azimuth", href: "/tools/gis/bearing-azimuth-calculator" },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-4xl font-bold text-center text-gray-900">
          Popular Conversion Tools
        </h2>

        <p className="mt-4 text-center text-gray-600">
          Convert coordinates, measure distance and area, size water storage, and manage documents and images in one smart workspace.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-2xl border border-gray-200 p-6 text-center shadow-sm transition hover:shadow-lg hover:-translate-y-1"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                {tool.label}
              </h3>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
