import Link from "next/link";

const values = [
  {
    title: "Fast File Processing",
    description:
      "DocMaster helps users convert, compress and manage files quickly from the browser.",
  },
  {
    title: "Practical Tools",
    description:
      "The platform focuses on document, PDF, image and GIS tools that users need in real daily work.",
  },
  {
    title: "Accessible for Everyone",
    description:
      "Many tools remain free and ad-supported so more users can access them without upfront cost.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-14">
      <section className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          About DocMaster Platform
        </p>

        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-gray-900">
          Smart document tools built for speed, simplicity and everyday productivity.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
          DocMaster is a document productivity platform created by Yoeln
          Digital Products. It brings together PDF conversion, image tools,GIS utilities and  AI-assisted workflows in one clean workspace.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {values.map((value) => (
            <article
              key={value.title}
              className="rounded-lg border border-gray-200 bg-gray-50 p-5"
            >
              <h2 className="text-lg font-bold text-gray-900">
                {value.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {value.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">
            Built for users who work with files every day.
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-blue-50">
            Whether someone needs to convert a PDF, compress a document,
            prepare images, or convert coordinate data, DocMaster AI aims to
            make the process simple and reliable.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Explore Tools
            </Link>

            <Link
              href="/pricing"
              className="rounded-md border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}