"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isToolsOpen, setIsToolsOpen] =
    useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsToolsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo and branding */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <Image
            src="/images/logo.png"
            alt="DocMaster AI logo"
            width={55}
            height={55}
            priority
            className="h-auto w-11 object-contain sm:w-[55px]"
          />

          <div className="hidden leading-tight sm:block">
            <p className="text-lg font-bold text-gray-900 lg:text-xl">
              DocMaster AI
            </p>

            <p className="max-w-48 truncate text-[11px] text-gray-500 lg:max-w-none lg:text-xs">
              The Smartest Document Platform
            </p>
          </div>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 font-medium text-gray-700 lg:flex">
          <Link
            href="/"
            className="transition-colors hover:text-blue-600"
          >
            Home
          </Link>

          {/* Desktop tools dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 transition-colors hover:text-blue-600"
            >
              Tools

              <ChevronDown
                size={17}
                className="transition-transform group-hover:rotate-180"
              />
            </button>

            <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-60 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
              <Link
                href="/tools/pdf"
                className="block rounded-xl px-4 py-3 transition hover:bg-blue-50 hover:text-blue-600"
              >
                📄 PDF Tools
              </Link>

              <Link
                href="/tools/office"
                className="block rounded-xl px-4 py-3 transition hover:bg-blue-50 hover:text-blue-600"
              >
                📊 Office Tools
              </Link>

              <Link
                href="/tools/image"
                className="block rounded-xl px-4 py-3 transition hover:bg-blue-50 hover:text-blue-600"
              >
                🖼️ Image Tools
              </Link>
            </div>
          </div>

          <Link
            href="/pricing"
            className="transition-colors hover:text-blue-600"
          >
            Pricing
          </Link>

          <Link
            href="/about"
            className="transition-colors hover:text-blue-600"
          >
            About
          </Link>
        </div>

        {/* Desktop account buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>

        {/* Tablet controls */}
        <div className="hidden items-center gap-2 md:flex lg:hidden">
          <Link
            href="/login"
            className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            Login
          </Link>

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(
                (current) => !current
              )
            }
            className="rounded-xl border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() =>
            setIsMobileMenuOpen(
              (current) => !current
            )
          }
          className="rounded-xl border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </div>

      {/* Mobile and tablet menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-5 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
            >
              Home
            </Link>

            {/* Mobile tools dropdown */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setIsToolsOpen(
                    (current) => !current
                  )
                }
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
              >
                Tools

                <ChevronDown
                  size={18}
                  className={`transition-transform ${
                    isToolsOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {isToolsOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-100 pl-3">
                  <Link
                    href="/tools/pdf"
                    onClick={closeMobileMenu}
                    className="block rounded-xl px-4 py-3 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    📄 PDF Tools
                  </Link>

                  <Link
                    href="/tools/office"
                    onClick={closeMobileMenu}
                    className="block rounded-xl px-4 py-3 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    📊 Office Tools
                  </Link>

                  <Link
                    href="/tools/image"
                    onClick={closeMobileMenu}
                    className="block rounded-xl px-4 py-3 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    🖼️ Image Tools
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
            >
              Pricing
            </Link>

            <Link
              href="/about"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
            >
              About
            </Link>

            {/* Mobile account buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-5 md:hidden">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Login
              </Link>

              <Link
                href="/signup"
                onClick={closeMobileMenu}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </div>

            {/* Tablet signup button */}
            <Link
              href="/signup"
              onClick={closeMobileMenu}
              className="mt-4 hidden rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700 md:block"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}