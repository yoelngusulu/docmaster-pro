export type PremiumPlanConfig = {
  plan: "PREMIUM";
  planName: string;
  currency: "TZS";
  amountTzs: number;
  billingPeriod: string;
  billingPeriodMonths: number;
  airtelLipaNamba: string;
  paymentReferencePrefix: string;
  requestExpiryHours: number;
  checkoutConfigured: boolean;
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

export function formatTzs(amount: number) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPremiumPlanConfig(): PremiumPlanConfig {
  const amountTzs = parsePositiveInteger(
    process.env.DOCMASTER_PREMIUM_PRICE_TZS,
    process.env.NODE_ENV === "production" ? 0 : 2000
  );

  const billingPeriodMonths = parsePositiveInteger(
    process.env.DOCMASTER_PREMIUM_BILLING_MONTHS,
    1
  );

  const requestExpiryHours = parsePositiveInteger(
    process.env.DOCMASTER_PAYMENT_REQUEST_EXPIRY_HOURS,
    48
  );

  const airtelLipaNamba = (
    process.env.DOCMASTER_AIRTEL_LIPA_NAMBA || ""
  ).trim();

  const paymentReferencePrefix =
    (
      process.env.DOCMASTER_PAYMENT_REFERENCE_PREFIX ||
      "DOCMASTER"
    ).trim() || "DOCMASTER";

  return {
    plan: "PREMIUM",
    planName: "DocMaster Premium",
    currency: "TZS",
    amountTzs,
    billingPeriod:
      billingPeriodMonths === 1
        ? "Monthly"
        : `${billingPeriodMonths} months`,
    billingPeriodMonths,
    airtelLipaNamba,
    paymentReferencePrefix,
    requestExpiryHours,
    checkoutConfigured:
      amountTzs > 0 && airtelLipaNamba.length > 0,
  };
}
