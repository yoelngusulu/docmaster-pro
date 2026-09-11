import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/lib/site/config";

const productLinks = [
  {
    label: "YAJU Documents",
    href: "/tools/pdf",
  },
  {
    label: "YAJU Images",
    href: "/tools/image",
  },
  {
    label: "YAJU Coordinates",
    href: "/tools/gis",
  },
  {
    label: "YAJU AI",
    href: "/tools/ai",
  },
];

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
                alt="YAJU logo"
                width={36}
                height={18}
                style={{
                  width: "36px",
                  height: "auto",
                }}
              />

              <div className="leading-tight">
                <p className="text-2xl font-bold text-white">
                  {siteConfig.productName}
                </p>
                <p className="text-xs text-gray-400">
                  Documents • Images • Coordinates • AI
                </p>
              </div>
            </Link>

            <p className="mt-5 text-sm leading-7">
              Fast, secure and professional productivity platform
              developed by {siteConfig.legalOwnerName}.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              Product Suite
            </h3>

            <ul className="mt-4 space-y-3">
              {productLinks.map((product) => (
                <li key={product.href}>
                  <Link
                    href={product.href}
                    className="transition hover:text-white"
                  >
                    {product.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white">
              About
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
          {siteConfig.copyrightText}
        </div>
      </div>
    </footer>
  );
}
