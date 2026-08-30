"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PaymentStatus } from "@/lib/billing/subscriptions";

type AdminPaymentActionsProps = {
  paymentId: string;
  status: PaymentStatus;
};

export default function AdminPaymentActions({
  paymentId,
  status,
}: AdminPaymentActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAction(action: "approve" | "reject") {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/payments/${paymentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            note,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to update payment request."
        );
      }

      setMessage(data?.message || "Payment request updated.");
      setNote("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update payment request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabled = isSubmitting || status !== "PENDING";

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Internal verification note"
        rows={3}
        disabled={status !== "PENDING"}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submitAction("approve")}
          disabled={disabled}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>

        <button
          type="button"
          onClick={() => submitAction("reject")}
          disabled={disabled}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
