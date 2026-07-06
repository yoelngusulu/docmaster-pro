import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import UploadBox from "@/components/UploadBox";
import ToolCategories from "@/components/ToolCategories";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <UploadBox />
      <ToolCategories />
      <Features />
      <HowItWorks />
      <Footer />
    </>
  );
}