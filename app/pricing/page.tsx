import Link from "next/link";

import {
  formatTzs,
  getPremiumPlanConfig,
} from "@/lib/billing/config";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
};

function getPlans(): Plan[] {
  const premiumPlan = getPremiumPlanConfig();
  const premiumReady = premiumPlan.checkoutConfigured;

  return [
    {
      name: "Guest",
      price: "Free",
      description:
        "Start converting documents without creating an account.",
      features: [
        "3 limited conversions per day",
        "Unlimited ad-supported basic tools",
        "PDF split, merge and compress",
        "Image and GIS tools",
      ],
      cta: "Start Free",
      href: "/tools",
      featured: false,
    },
    {
      name: "Registered",
      price: "Free Account",
      description:
        "Create an account and get a higher daily conversion limit.",
      features: [
        "5 limited conversions per day",
        "Conversion history",
        "Unlimited ad-supported basic tools",
        "Access from dashboard",
      ],
      cta: "Create Account",
      href: "/register",
      featured: true,
    },
    {
      name: "Premium",
      price: premiumReady
        ? `${formatTzs(premiumPlan.amountTzs)} / ${premiumPlan.billingPeriod.toLowerCase()}`
        : "Coming Soon",
      description: premiumReady
        ? "Unlimited productivity for users with heavy document workflows."
        : "Unlimited productivity for teams and heavy document workflows.",
      features: [
        "Unlimited limited-tool conversions",
        "No free-tool waiting screen",
        "Priority processing",
        "Advanced AI document tools",
      ],
      cta: premiumReady ? "Upgrade to Premium" : "View Tools",
      href: premiumReady ? "/checkout/premium" : "/tools",
      featured: false,
    },
  ];
}

export const metadata = {
  title: "Pricing | DocMaster AI",
  description:
    "DocMaster AI pricing for guests, registered users and premium users.",
};

export default function PricingPage() {
  const plans = getPlans();
  const premiumReady = getPremiumPlanConfig().checkoutConfigured;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Pricing
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Simple Plans for Every User
          </h1>

          <p className="mt-4 text-lg leading-8 text-gray-600">
            Use DocMaster AI free with daily limits, then upgrade to
            Premium when your workflow needs more power.
          </p>
        </div>

        {!premiumReady && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm leading-6 text-amber-800">
            Premium checkout is waiting for server payment settings.
            Free and registered plans remain available.
          </div>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex h-full flex-col rounded-2xl border bg-white p-8 shadow-sm ${
                plan.featured
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200"
              }`}
            >
              <h2 className="text-2xl font-bold text-gray-900">
                {plan.name}
              </h2>

              <p className="mt-3 text-3xl font-bold text-blue-600">
                {plan.price}
              </p>

              <p className="mt-4 leading-7 text-gray-600">
                {plan.description}
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>

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
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
