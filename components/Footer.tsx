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

function YajuWordmark() {
  return (
    <span
      className="inline-flex items-baseline text-2xl font-extrabold tracking-[-0.06em] text-white"
      aria-label="YAJU"
    >
      <span>Y</span>
      <span
        className="relative mx-[0.01em] inline-block w-[0.78em]"
        aria-hidden="true"
      >
        <span className="invisible">A</span>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full overflow-visible"
          focusable="false"
        >
          <path
            d="M4 94 L42 8 Q50 -2 58 8 L96 94 H76 L50 35 L24 94 Z"
            fill="currentColor"
          />
          <path
            d="M38 78 L50 52 L62 78 Z"
            fill="#1597F5"
          />
        </svg>
      </span>
      <span>JU</span>
    </span>
  );
}

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
                src="/images/yaju-logo-v2.svg"
                alt="YAJU logo"
                width={42}
                height={40}
                className="h-10 w-auto object-contain"
              />

              <div className="leading-tight">
                <p>
                  <YajuWordmark />
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
