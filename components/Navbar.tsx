import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white shadow-md border-b border-gray-200">
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="DocMaster Logo"
          width={180}
          height={60}
          priority
        />
      </Link>

      {/* Navigation */}
     <div className="hidden md:flex gap-8 font-medium text-gray-700">
  <Link href="/" className="hover:text-blue-600 transition-colors">
    Home
  </Link>

  <Link href="/tools" className="hover:text-blue-600 transition-colors">
    Tools
  </Link>

  <Link href="/pricing" className="hover:text-blue-600 transition-colors">
    Pricing
  </Link>

  <Link href="/about" className="hover:text-blue-600 transition-colors">
    About
  </Link>
</div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50">
          Login
        </button>

        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          Sign Up
        </button>
      </div>
    </nav>
  );
}