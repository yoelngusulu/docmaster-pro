import Hero from "@/components/Hero";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import PopularTools from "@/components/PopularTools";
import CallToAction from "@/components/CallToAction";
import AIAssistant from "@/components/AIAssistant";

export default function Home() {
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

      {/* Call to action */}
      <CallToAction />

      {/* Floating AI chatbot */}
      <AIAssistant />
    </main>
  );
}
