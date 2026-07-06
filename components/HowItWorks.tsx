export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload",
      description: "Choose or drag your document into the upload box.",
    },
    {
      number: "02",
      title: "Convert",
      description: "Select the conversion type and let DocMaster process it.",
    },
    {
      number: "03",
      title: "Download",
      description: "Download your converted file instantly.",
    },
  ];

  return (
    <section className="bg-blue-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-bold text-gray-900">
          How It Works
        </h2>

        <p className="mt-4 text-center text-gray-600">
          Convert your files in three simple steps.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl bg-white p-8 text-center shadow-md"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                {step.number}
              </div>

              <h3 className="mt-6 text-2xl font-bold text-gray-800">
                {step.title}
              </h3>

              <p className="mt-3 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}