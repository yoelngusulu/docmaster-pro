"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const supabase = createClient();

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [urlError, setUrlError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const errorDescription =
      params.get("error_description");

    if (errorDescription) {
      queueMicrotask(() => {
        setUrlError(
          errorDescription
        );
      });
    }
  }, []);

  const handleUpdatePassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error(
          "Your password reset link is invalid or has expired. Please request a new reset link."
        );
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Password updated successfully. You can now log in with your new password."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Password
          </h1>

          <p className="mt-3 text-gray-600">
            Enter a new password for your
            DocMaster account.
          </p>
        </div>

        {urlError && !message && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600">
            {urlError}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {!message && !urlError && (
          <form
            onSubmit={
              handleUpdatePassword
            }
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block font-medium text-gray-700"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block font-medium text-gray-700"
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Enter password again"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Updating..."
                : "Update Password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          {message ? (
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              Go to Login
            </Link>
          ) : (
            <>
              Need a new reset link?{" "}
              <Link
                href="/forgot-password"
                className="font-semibold text-blue-600 hover:underline"
              >
                Request Again
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
