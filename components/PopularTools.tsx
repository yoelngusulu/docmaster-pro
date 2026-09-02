export default function PopularTools() {
  const tools = [
    "PDF → Word",
    "Word → PDF",
    "Excel → PDF",
    "PowerPoint → PDF",
    "Merge PDF",
    "Split PDF",
    "Compress PDF",
    "Image → PDF",
    "PDF → JPG",
    "Protect PDF",
    "Unlock PDF",
    "Rotate PDF",
    "coordinates converter"
      ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-4xl font-bold text-center text-gray-900">
          Popular Conversion Tools
        </h2>

        <p className="mt-4 text-center text-gray-600">
          Everything you need to manage your PDF files in one place.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <div
              key={tool}
              className="rounded-2xl border border-gray-200 p-6 text-center shadow-sm transition hover:shadow-lg hover:-translate-y-1"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                {tool}
              </h3>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}