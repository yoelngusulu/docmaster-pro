"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { motion} from "framer-motion"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isToolsOpen, setIsToolsOpen] =
    useState(false);

  const [user, setUser] =
    useState<User | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [supabase] = useState(() =>
    createClient()
  );

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setUser(currentUser);
        setIsAuthLoading(false);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(
            session?.user ?? null
          );

          setIsAuthLoading(false);
        }
      );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsToolsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <motion.div
  animate={{
    scale: [1, 1.08, 1],
  }}
  transition={{
    duration: 1.5,
    delay: 5,
    repeat: Infinity,
    repeatDelay: 4.2,
    ease: "easeInOut",
  }}
  >
              <Image
            src="/images/logo.png"
            alt="DocMaster logo"
            width={100}
            height={50}
            priority
            className="h-auto w-auto"
          />
</motion.div> 
          <div className="hidden leading-tight sm:block">
                     <p className="max-w-48 truncate text-[11px] text-gray-500 lg:max-w-none lg:text-xs">
              The Smartest Document Platform
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-7 font-medium text-gray-700 lg:flex">
          <Link
            href="/"
            className="transition-colors hover:text-blue-600"
          >
            Home
          </Link>

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

        <div className="hidden min-w-[190px] items-center justify-end gap-3 lg:flex">
          {!isAuthLoading &&
            (user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  Dashboard
                </Link>

                <a
                  href="/logout"
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                >
                  Logout
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            ))}
        </div>

        <div className="hidden items-center gap-2 md:flex lg:hidden">
          {!isAuthLoading &&
            (user ? (
              <Link
                href="/dashboard"
                className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
              >
                Login
              </Link>
            ))}

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

            {!isAuthLoading && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-5">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={
                        closeMobileMenu
                      }
                      className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50"
                    >
                      Dashboard
                    </Link>

                    <a
                      href="/logout"
                      className="rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-red-700"
                    >
                      Logout
                    </a>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={
                        closeMobileMenu
                      }
                      className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50"
                    >
                      Login
                    </Link>

                    <Link
                      href="/register"
                      onClick={
                        closeMobileMenu
                      }
                      className="rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}