export default function Features() {
  const features = [
    {
      icon: "⚡",
      title: "Fast Conversion",
      description: "Convert your files in just a few seconds.",
    },
    {
      icon: "🔒",
      title: "Secure",
      description: "Your files are protected and automatically deleted.",
    },
    {
      icon: "🌍",
      title: "Works Everywhere",
      description: "Use DocMaster on Windows, Mac, Linux or Mobile.",
    },
    {
      icon: "💯",
      title: "High Quality",
      description: "Keep formatting and document quality.",
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
          Why Choose DocMaster?
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl bg-white p-8 shadow-md transition hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="text-5xl">{feature.icon}</div>

              <h3 className="mt-5 text-xl font-bold text-gray-800">
                {feature.title}
              </h3>

              <p className="mt-3 text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}