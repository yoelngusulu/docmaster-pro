import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPaymentActions from "@/components/AdminPaymentActions";
import { formatTzs } from "@/lib/billing/config";
import {
  expirePendingPaymentRequests,
  isBillingSchemaMissingError,
} from "@/lib/billing/subscriptions";
import type { PaymentRequestRow } from "@/lib/billing/subscriptions";
import { requireAdmin } from "@/lib/admin/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Payment Verification | DocMaster AI",
  description:
    "Admin payment verification for DocMaster Premium.",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  EXPIRED: "bg-gray-50 text-gray-700 border-gray-200",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

async function loadAccountEmails(
  userIds: string[]
) {
  const admin = createAdminClient();
  const accountEmails = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } =
        await admin.auth.admin.getUserById(userId);

      accountEmails.set(
        userId,
        error
          ? userId
          : data.user?.email || userId
      );
    })
  );

  return accountEmails;
}

export default async function AdminPaymentsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  await expirePendingPaymentRequests();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payment_requests")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    if (isBillingSchemaMissingError(error)) {
      return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
          <section className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
              Billing Setup Required
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              Premium payment tables are not ready yet
            </h1>
            <p className="mt-4 leading-7 text-gray-600">
              Run the Supabase migration in
              supabase/migrations/202608300700_premium_payment_flow.sql,
              then refresh this page.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </section>
        </main>
      );
    }

    throw error;
  }

  const payments = (data as PaymentRequestRow[] | null) ?? [];
  const accountEmails = await loadAccountEmails(
    Array.from(new Set(payments.map((payment) => payment.user_id)))
  );
  const pendingCount = payments.filter(
    (payment) => payment.status === "PENDING"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to Dashboard
        </Link>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Admin Verification
              </p>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">
                Premium Payments
              </h1>
              <p className="mt-2 text-gray-600">
                Review Airtel Money payment requests before activating
                Premium access.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-5 py-4 text-blue-700">
              <p className="text-sm font-semibold">Pending</p>
              <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            {payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
                No payment requests yet.
              </div>
            ) : (
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Reviewed</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            statusStyles[payment.status] ||
                            "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        <p className="font-semibold text-gray-900">
                          {accountEmails.get(payment.user_id) ||
                            payment.user_id}
                        </p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">
                          {payment.user_id}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono text-gray-800">
                        {payment.transaction_reference}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        <p className="font-semibold text-gray-900">
                          {formatTzs(payment.amount_tzs)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Expected {formatTzs(payment.expected_amount_tzs)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {payment.phone_number}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(payment.submitted_at)}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(payment.reviewed_at)}
                        {payment.admin_note && (
                          <p className="mt-2 max-w-[220px] rounded-lg bg-gray-50 p-2 text-xs leading-5 text-gray-600">
                            {payment.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <AdminPaymentActions
                          paymentId={payment.id}
                          status={payment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
