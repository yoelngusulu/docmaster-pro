import Link from "next/link";
import { redirect } from "next/navigation";

import {
  formatTzs,
  getPremiumPlanConfig,
} from "@/lib/billing/config";
import { getUserBillingSummary } from "@/lib/billing/subscriptions";
import { createClient } from "@/lib/supabase/server";

type Conversion = {
  id: number;
  tool: string;
  original_file_name: string;
  output_file_name: string;
  created_at: string;
};

const toolLabels: Record<string, string> = {
  "coordinates-bulk": "Coordinates Bulk",
  "compress-pdf": "Compress PDF",
  "split-pdf": "Split PDF",
  "merge-pdf": "Merge PDF",
  "protect-pdf": "Protect PDF",
  "unlock-pdf": "Unlock PDF",
  "pdf-to-word": "PDF to Word",
  "pdf-to-excel": "PDF to Excel",
  "pdf-to-powerpoint": "PDF to PowerPoint",
  "pdf-to-image": "PDF to Image",
  "word-to-pdf": "Word to PDF",
  "image-to-pdf": "Image to PDF",
  "compress-image": "Compress Image",
  "jpg-to-png": "JPG to PNG",
  "png-to-jpg": "PNG to JPG",
  "webp-to-jpg": "WEBP to JPG",
  "webp-to-png": "WEBP to PNG",
};

function getToolLabel(tool: string) {
  return toolLabels[tool] ?? tool;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

function formatStatus(status: string | null | undefined) {
  if (!status || status === "NONE") {
    return "Not active";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "DocMaster User";

  const billingSummary = await getUserBillingSummary(user.id);
  const premiumPlan = getPremiumPlanConfig();
  const accountPlan =
    billingSummary.plan === "PREMIUM" ? "Premium" : "Free";
  const billingCta =
    billingSummary.plan === "PREMIUM"
      ? "Renew Premium"
      : "Upgrade to Premium";

  const {
    data: conversions,
    error: conversionsError,
  } = await supabase
    .from("conversion_history")
    .select(
      "id, tool, original_file_name, output_file_name, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (conversionsError) {
    console.error(
      "Unable to load conversion history:",
      conversionsError
    );
  }

  const history = (conversions as Conversion[] | null) ?? [];
  const totalConversions = history.length;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const todayConversions = history.filter(
    (conversion) =>
      new Date(conversion.created_at) >= startOfToday
  ).length;

  const recentConversions = history.slice(0, 10);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            DocMaster AI Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Welcome, {fullName}
          </h1>

          <p className="mt-3 text-gray-600">
            You are signed in as {user.email}
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Today&apos;s Conversions
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {todayConversions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Conversions
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalConversions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Account Plan
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {accountPlan}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Subscription / Billing
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Premium access is activated after payment verification.
              </p>
            </div>

            <Link
              href="/checkout/premium"
              className="inline-flex w-full justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              {billingCta}
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {accountPlan}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Status</p>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {formatStatus(billingSummary.subscriptionStatus)}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Expiry date</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                {formatDate(billingSummary.expiresAt)}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Premium price</p>
              <p className="mt-2 text-sm font-bold leading-6 text-gray-900">
                {premiumPlan.checkoutConfigured
                  ? `${formatTzs(premiumPlan.amountTzs)} / ${premiumPlan.billingPeriod}`
                  : "Setup pending"}
              </p>
            </div>
          </div>

          {billingSummary.pendingPayment ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
              <p className="font-bold">
                Payment submitted for verification
              </p>
              <p className="mt-1">
                Your Premium request is pending admin verification.
                Submitted on {formatDate(
                  billingSummary.pendingPayment.submitted_at
                )}.
              </p>
            </div>
          ) : billingSummary.latestPayment ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-700">
              Latest payment request status: {" "}
              <span className="font-bold">
                {formatStatus(billingSummary.latestPayment.status)}
              </span>
              .
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Start a new conversion quickly.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/tools/pdf"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                PDF
              </p>
              <h3 className="mt-3 font-semibold text-gray-900">
                PDF Tools
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Convert, merge, split, compress and manage PDFs.
              </p>
            </Link>

            <Link
              href="/tools/image"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Image
              </p>
              <h3 className="mt-3 font-semibold text-gray-900">
                Image Tools
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Convert and compress image files.
              </p>
            </Link>

            <Link
              href="/tools/coordinates-converter"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                GIS
              </p>
              <h3 className="mt-3 font-semibold text-gray-900">
                Coordinates Converter
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Convert Decimal, DMS, UTM and bulk CSV or Excel coordinates.
              </p>
            </Link>

            <Link
              href="/tools/pdf/pdf-to-word"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Popular
              </p>
              <h3 className="mt-3 font-semibold text-gray-900">
                PDF to Word
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Quickly convert a PDF into an editable Word file.
              </p>
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Conversions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your latest DocMaster activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                {totalConversions} total
              </span>

              <Link
                href="/history"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
              >
                View All History
              </Link>
            </div>
          </div>

          {recentConversions.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="font-medium text-gray-700">
                No conversions yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your conversion history will appear here after you use a tool.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-4 py-3 font-medium">
                      Tool
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Original File
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Output File
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentConversions.map((conversion) => (
                    <tr
                      key={conversion.id}
                      className="border-b border-gray-100 text-sm"
                    >
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700">
                          {getToolLabel(conversion.tool)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {conversion.original_file_name}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {conversion.output_file_name}
                      </td>

                      <td className="px-4 py-4 text-gray-500">
                        {formatDate(conversion.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
