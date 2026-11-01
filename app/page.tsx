import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import Hero from "@/components/Hero";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PopularTools from "@/components/PopularTools";
import WaitlistForm from "@/components/WaitlistForm";
import CallToAction from "@/components/CallToAction";
import AIAssistant from "@/components/AIAssistant";
import ConditionalGoogleAd from "@/components/ConditionalGoogleAd";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  // Supabase recovery emails can land on the Site URL with a code query parameter
  // when the email template or redirect allow-list overrides redirectTo.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/update-password`);
  }

  return (
    <main>
      {/* Hero section */}
      <Hero />
      {/* Main tool categories */}
      <ToolCategories />
      <Suspense fallback={null}>
        <ConditionalGoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          className="my-12"
        />
      </Suspense>
      {/* Website features */}
      <Features />
      {/* How the platform works */}
      <HowItWorks />
      {/* Popular tools */}
      <PopularTools />
      {/* Partnership invitation */}
      <section className="bg-slate-950 px-5 py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Grow with YAJU</p>
            <h2 className="mt-3 text-3xl font-bold">Let’s build digital solutions together.</h2>
            <p className="mt-3 leading-7 text-slate-300">We welcome technology, business, strategic and affiliate partners who want to create more value through practical digital tools.</p>
          </div>
          <Link href="/partners" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-500">
            Become a Partner <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      {/* Waitlist signup */}
      <WaitlistForm />
      {/* Call to action */}
      <CallToAction />
      {/* Floating AI chatbot */}
      <AIAssistant />
    </main>
  );
}
