import { redirect } from "next/navigation";

import Hero from "@/components/Hero";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PopularTools from "@/components/PopularTools";
import WaitlistForm from "@/components/WaitlistForm";
import CallToAction from "@/components/CallToAction";
import AIAssistant from "@/components/AIAssistant";
import GoogleAd from "@/components/GoogleAd";
import { canServeAdsForCurrentUser } from "@/lib/ads/visibility";

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

  const showAds = await canServeAdsForCurrentUser();

  return (
    <main>
      {/* Hero section */}
      <Hero />
      {/* Main tool categories */}
      <ToolCategories />
      {showAds && (
        <GoogleAd
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          className="my-12"
        />
      )}
      {/* Website features */}
      <Features />
      {/* How the platform works */}
      <HowItWorks />
      {/* Popular tools */}
      <PopularTools />
      {/* Waitlist signup */}
      <WaitlistForm />
      {/* Call to action */}
      <CallToAction />
      {/* Floating AI chatbot */}
      <AIAssistant />
    </main>
  );
}
