import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

type ToolStatus =
  | "available"
  | "server-coming-soon";

type ToolHubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  status?: ToolStatus;
};

type ToolHubPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  backLink?: string;
  backText?: string;
  tools: ToolHubItem[];
};

export default function ToolHubPage({
  eyebrow,
  title,
  subtitle,
  backLink = "/",
  backText = "Back to Home",
  tools,
}: ToolHubPageProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          {backText}
        </Link>

        <section className="mt-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
            {subtitle}
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isServerComingSoon =
              tool.status === "server-coming-soon";
            const badgeClass = isServerComingSoon
              ? "bg-amber-50 text-amber-700"
              : tool.status === "available"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600";
            const iconClass = isServerComingSoon
              ? "bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white"
              : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white";
            const linkClass = isServerComingSoon
              ? "hover:border-amber-300"
              : "hover:border-blue-300";

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group flex min-h-44 flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${linkClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${iconClass}`}
                  >
                    <Icon size={22} />
                  </div>

                  {tool.badge && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-lg font-bold text-gray-950">
                  {tool.title}
                </h2>

                <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">
                  {tool.description}
                </p>

                <span
                  className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${
                    isServerComingSoon
                      ? "text-amber-700"
                      : "text-blue-600"
                  }`}
                >
                  {isServerComingSoon
                    ? "View Status"
                    : "Open Tool"}
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
