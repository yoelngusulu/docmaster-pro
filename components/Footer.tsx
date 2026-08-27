import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <Image
                src="/images/logo.png"
                alt="DocMaster logo"
                width={36}
                height={18}
                style={{width:"36px",
                  height:"auto"}}
                  />
             
              <div className="leading-tight">
                <p className="text-2xl font-bold text-white">
                  DocMaster
                </p>
                <p className="text-xs text-gray-400">
                  Smart Document Platform
                </p>
              </div>
            </Link>

            <p className="mt-5 text-sm leading-7">
              Fast, secure and professional document conversion
              platform developed by Yoeln Digital Products.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Product
            </h3>

            <ul className="mt-4 space-y-3">
              <li>PDF to Word</li>
              <li>Word to PDF</li>
              <li>Merge PDF</li>
              <li>Compress PDF</li>
              <li>Unlock PDF</li>
              <li>Image to PDF</li>
              <li>Coordinate Convertor</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Company
            </h3>

            <ul className="mt-4 space-y-3">
              <li>About</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Support
            </h3>

            <ul className="mt-4 space-y-3">
              <li>Help Center</li>
              <li>Documentation</li>
              <li>API</li>
              <li>Email Support</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-700 pt-8 text-center text-sm">
          © 2026 DocMaster. Built by <strong>Yoeln Digital Products</strong>.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}
