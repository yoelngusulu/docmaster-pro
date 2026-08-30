"use client";

import { useMemo, useState } from "react";

import { maskPhoneNumber } from "@/lib/billing/format";

type SubmittedPayment = {
  id: string;
  status: string;
  amountTzs: number;
  expectedAmountTzs: number;
  phoneNumberMasked: string;
  expiresAt: string;
};

type PremiumPaymentFormProps = {
  planName: string;
  formattedPrice: string;
  amountTzs: number;
  billingPeriod: string;
  airtelLipaNamba: string;
  accountReference: string;
  checkoutConfigured: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function PremiumPaymentForm({
  planName,
  formattedPrice,
  amountTzs,
  billingPeriod,
  airtelLipaNamba,
  accountReference,
  checkoutConfigured,
}: PremiumPaymentFormProps) {
  const [transactionReference, setTransactionReference] =
    useState("");
  const [amountPaid, setAmountPaid] = useState(
    String(amountTzs || "")
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [submittedPayment, setSubmittedPayment] =
    useState<SubmittedPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maskedPhoneNumber = useMemo(
    () => maskPhoneNumber(phoneNumber),
    [phoneNumber]
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSubmittedPayment(null);

    if (!checkoutConfigured) {
      setError(
        "Premium checkout is not configured yet. Please contact DocMaster support."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/billing/premium/payment-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionReference,
            amountPaid,
            phoneNumber,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to submit payment for verification."
        );
      }

      setSubmittedPayment(data.payment as SubmittedPayment);
      setTransactionReference("");
      setPhoneNumber("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit payment for verification."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Secure Manual Checkout
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          {planName}
        </h1>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Price</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formattedPrice}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Billing period
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {billingPeriod}
            </p>
          </div>
        </div>

        {!checkoutConfigured ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Premium checkout is not configured yet. Set the server
            environment variables before accepting real payments.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="font-bold text-gray-900">
              Airtel Money payment instructions
            </h2>

            <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>1. Open Airtel Money on your phone.</li>
              <li>
                2. Choose Lipa Namba or Pay Merchant, then enter
                the DocMaster Lipa Namba below.
              </li>
              <li>
                3. Pay {formattedPrice} for {billingPeriod} Premium
                access.
              </li>
              <li>
                4. If Airtel asks for a payment reference, use
                {" "}
                <span className="font-semibold text-gray-900">
                  {accountReference}
                </span>
                .
              </li>
              <li>
                5. Copy your Airtel transaction ID and submit it for
                admin verification.
              </li>
            </ol>

            <div className="mt-5 rounded-xl bg-white p-4">
              <p className="text-sm text-gray-500">
                Airtel Lipa Namba
              </p>
              <p className="mt-1 text-3xl font-bold tracking-wide text-gray-900">
                {airtelLipaNamba}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Submit payment details
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Premium will activate only after an authorized admin verifies
          your Airtel payment. Submitting a transaction ID does not
          confirm payment automatically.
        </p>

        {submittedPayment && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
            <p className="font-bold">
              Payment submitted for verification
            </p>
            <p className="mt-1">
              Status: {submittedPayment.status}. We will activate
              Premium after verification.
            </p>
            <p className="mt-1">
              Phone: {submittedPayment.phoneNumberMasked}
            </p>
            <p className="mt-1">
              Request expires: {formatDate(submittedPayment.expiresAt)}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="transaction-reference"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Airtel transaction ID
            </label>
            <input
              id="transaction-reference"
              value={transactionReference}
              onChange={(event) =>
                setTransactionReference(event.target.value)
              }
              placeholder="Example: PP2408ABC123"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="amount-paid"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Amount paid (TZS)
            </label>
            <input
              id="amount-paid"
              inputMode="numeric"
              value={amountPaid}
              onChange={(event) =>
                setAmountPaid(event.target.value)
              }
              placeholder={String(amountTzs || "")}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="phone-number"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Phone number used for payment
            </label>
            <input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              placeholder="Example: 2557XXXXXXX"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {maskedPhoneNumber && (
              <p className="mt-2 text-xs text-gray-500">
                Displayed as {maskedPhoneNumber}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !checkoutConfigured}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Submitting for verification..."
              : "Submit Payment for Verification"}
          </button>
        </form>
      </section>
    </div>
  );
}
