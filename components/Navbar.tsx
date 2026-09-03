"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  MapPinned,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";

import { createClient } from "@/lib/supabase/client";

const toolLinks = [
  {
    href: "/tools/pdf",
    label: "PDF Tools",
    icon: FileText,
  },
  {
    href: "/tools/image",
    label: "Image Tools",
    icon: ImageIcon,
  },
  {
    href: "/tools/coordinates-converter",
    label: "Coordinates Converter",
    icon: MapPinned,
  },
];

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = localStorage.getItem("docmaster-theme");

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark"
  );
  localStorage.setItem("docmaster-theme", theme);
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isToolsOpen, setIsToolsOpen] =
    useState(false);

  const [user, setUser] =
    useState<User | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [theme, setTheme] = useState<Theme>("light");

  const [supabase] = useState(() =>
    createClient()
  );

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

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

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme =
        currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      return nextTheme;
    });
  };

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel =
    theme === "dark" ? "Use light mode" : "Use dark mode";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
  href="/"
  onClick={closeMobileMenu}
  className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
>
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 1.5,
      delay: 5,
      repeat: Infinity,
      repeatDelay: 4.2,
      ease: "easeInOut",
    }}
    className="flex shrink-0 items-center justify-center"
  >
    <Image
      src="/images/logo.png"
      alt="DocMaster icon"
      width={36}
      height={42}
      priority
      className="h-10 w-auto object-contain"
    />
  </motion.div>

  <div className="min-w-0 leading-tight">
    <p className="text-lg font-extrabold tracking-tight sm:text-xl">
      <span className="text-gray-950 dark:text-white">
        Doc
      </span>
      <span className="text-blue-600 dark:text-blue-400">
        Master
      </span>
    </p>

    <p className="block max-w-[140px] whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:max-w-none sm:text-[10px] dark:text-slate-400">
      Smart Document Platform
    </p>
  </div>
</Link>

        <div className="hidden items-center gap-7 font-medium text-gray-700 lg:flex dark:text-slate-200">
          <Link
            href="/"
            className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            Home
          </Link>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              Tools

              <ChevronDown
                size={17}
                className="transition-transform group-hover:rotate-180"
              />
            </button>

            <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
              {toolLinks.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                  >
                    <Icon size={18} />

                    <span>
                      {tool.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <Link
            href="/pricing"
            className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            Pricing
          </Link>

          <Link
            href="/about"
            className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            About
          </Link>
        </div>

        <div className="hidden min-w-[238px] items-center justify-end gap-3 lg:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={themeLabel}
            title={themeLabel}
          >
            <ThemeIcon size={18} />
          </button>

          {!isAuthLoading &&
            (user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
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
                  className="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
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
                className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                Login
              </Link>
            ))}

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={themeLabel}
            title={themeLabel}
          >
            <ThemeIcon size={18} />
          </button>

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(
                (current) => !current
              )
            }
            className="rounded-xl border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={themeLabel}
            title={themeLabel}
          >
            <ThemeIcon size={18} />
          </button>

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(
                (current) => !current
              )
            }
            className="rounded-xl border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-5 shadow-lg lg:hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
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
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
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
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-100 pl-3 dark:border-slate-700">
                  {toolLinks.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                      >
                        <Icon size={18} />

                        <span>
                          {tool.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
            >
              Pricing
            </Link>

            <Link
              href="/about"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
            >
              About
            </Link>

            {!isAuthLoading && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-5 dark:border-slate-700">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
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
                      onClick={closeMobileMenu}
                      className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      Login
                    </Link>

                    <Link
                      href="/register"
                      onClick={closeMobileMenu}
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
