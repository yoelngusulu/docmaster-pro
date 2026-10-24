import { redirect } from "next/navigation";

import Hero from "@/components/Hero";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PopularTools from "@/components/PopularTools";
import WaitlistForm from "@/components/WaitlistForm";
import CallToAction from "@/components/CallToAction";
import AIAssistant from "@/components/AIAssistant";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const type = typeof params.type === "string" ? params.type : null;

  // Some Supabase recovery email templates send recovery codes to the Site URL
  // instead of honoring redirectTo. Route those links through the auth callback.
  if (code && type === "recovery") {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/update-password`);
  }

  return (
    <main>
      {/* Hero section */}
      <Hero />
      {/* Main tool categories */}
      <ToolCategories />
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
