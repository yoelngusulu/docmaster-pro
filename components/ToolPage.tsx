import Link from "next/link";
import UploadArea from "./UploadArea";
import { toolConfig } from "./toolConfig";

type ToolPageProps = {
  tool: keyof typeof toolConfig;
  backLink: string;
  backText: string;
};

export default function ToolPage({
  tool,
  backLink,
  backText,
}: ToolPageProps) {
  const config = toolConfig[tool];

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href={backLink}
        className="text-blue-600 hover:underline"
      >
        ← {backText}
      </Link>

      <section className="mt-6">
        <h1 className="text-4xl font-bold">
          {config.title}
        </h1>

        <p className="mt-4 text-gray-600">
          {config.subtitle}
        </p>

        <UploadArea tool={tool} />
      </section>
    </main>
  );
}