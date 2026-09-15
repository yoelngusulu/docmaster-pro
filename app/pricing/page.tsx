import Link from "next/link";

import {
  formatTzs,
  getPremiumPlanConfig,
} from "@/lib/billing/config";

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  featured?: boolean;
  badge?: string;
};

function getPlans(): Plan[] {
  const premiumPlan = getPremiumPlanConfig();
  const premiumReady = premiumPlan.checkoutConfigured;

  return [
    {
      name: "Free",
      price: "TSh 0",
      description:
        "Useful everyday tools supported by ads. No unnecessary paywall for simple jobs.",
      features: [
        "Single coordinate conversions",
        "Distance and area tools",
        "PDF split and merge",
        "Other basic tools with ads",
        "Bulk processing is not included",
      ],
      cta: "Use Free Tools",
      href: "/tools",
    },
    {
      name: "Daily Pass",
      price: "TSh 700",
      cadence: "/ 24 hours",
      description:
        "For short, one-day jobs that need paid features without a monthly subscription.",
      features: [
        "Pro tools for 24 hours",
        "Processing credits for heavier jobs",
        "No ads during the pass",
        "Larger file limits than Free",
        "Bulk tools included within plan limits",
      ],
      cta: "Coming Soon",
    },
    {
      name: "Pro Monthly",
      price: premiumReady
        ? formatTzs(premiumPlan.amountTzs)
        : "TSh 10,500",
      cadence: "/ month",
      description:
        "The main YAJU plan for regular GIS, coordinate and document workflows.",
      features: [
        "All bulk coordinate conversions",
        "Batch and advanced PDF tools",
        "Monthly processing credits",
        "No ads",
        "Higher file and processing limits",
      ],
      cta: premiumReady ? "Upgrade to Pro" : "Coming Soon",
      href: premiumReady ? "/checkout/premium" : undefined,
      featured: true,
      badge: "Most Popular",
    },
    {
      name: "Pro Yearly",
      price: "TSh 100,000",
      cadence: "/ year",
      description:
        "The same Pro experience at a lower effective monthly cost.",
      features: [
        "All Pro features",
        "All bulk coordinate conversions",
        "Monthly processing credits",
        "No ads",
        "Save TSh 26,000 versus monthly billing",
      ],
      cta: "Coming Soon",
      badge: "Best Value",
    },
    {
      name: "Power User",
      price: "TSh 30,000",
      cadence: "/ month",
      description:
        "For professionals with high-volume GIS, document and data-processing workloads.",
      features: [
        "High-volume bulk processing",
        "Large monthly credit allowance",
        "Larger file and storage limits",
        "Priority processing",
        "Fair-use high-volume access",
      ],
      cta: "Coming Soon",
    },
  ];
}

export const metadata = {
  title: "Pricing | YAJU",
  description:
    "YAJU pricing for free, daily, Pro and high-volume users.",
};

export default function PricingPage() {
  const plans = getPlans();
  const premiumReady = getPremiumPlanConfig().checkoutConfigured;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Pricing
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Free for simple jobs. Pro when your workload grows.
          </h1>

          <p className="mt-4 text-lg leading-8 text-gray-600">
            Basic YAJU tools stay useful and ad-supported. Bulk processing,
            heavier document conversions and higher resource limits belong to
            paid plans.
          </p>
        </div>

        {!premiumReady && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm leading-6 text-amber-800">
            Paid checkout is still being configured. Free tools remain available
            while billing is being prepared.
          </div>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                plan.featured
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200"
              }`}
            >
              {plan.badge && (
                <span className="mb-4 w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {plan.badge}
                </span>
              )}

              <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>

              <div className="mt-3 flex flex-wrap items-end gap-1">
                <span className="text-3xl font-bold text-blue-600">
                  {plan.price}
                </span>
                {plan.cadence && (
                  <span className="pb-1 text-sm text-gray-500">
                    {plan.cadence}
                  </span>
                )}
              </div>

              <p className="mt-4 leading-7 text-gray-600">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="font-bold text-blue-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.href ? (
                <Link
                  href={plan.href}
                  className={`mt-8 rounded-xl px-5 py-3 text-center font-semibold transition ${
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-8 cursor-not-allowed rounded-xl bg-gray-100 px-5 py-3 text-center font-semibold text-gray-400"
                >
                  {plan.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            How YAJU processing credits work
          </h2>
          <p className="mt-3 leading-7 text-gray-600">
            Credits are reserved for operations that consume more server resources,
            such as large bulk conversions and heavy PDF processing. Simple tools can
            remain free and ad-supported, while paid plans receive larger credit
            allowances and higher limits.
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Storage and file-size limits remain separate from credits so YAJU can
            control infrastructure costs without restricting normal everyday use.
          </p>
        </div>
      </section>
    </main>
  );
}
