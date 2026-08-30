import Link from "next/link";
import { redirect } from "next/navigation";

import PremiumPaymentForm from "@/components/PremiumPaymentForm";
import {
  formatTzs,
  getPremiumPlanConfig,
} from "@/lib/billing/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Premium Checkout | DocMaster AI",
  description:
    "Submit Airtel Money payment details for DocMaster Premium verification.",
};

export default async function PremiumCheckoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout/premium");
  }

  const premiumPlan = getPremiumPlanConfig();
  const accountReference = `${premiumPlan.paymentReferencePrefix}-${user.id
    .slice(0, 8)
    .toUpperCase()}`;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/pricing"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Back to Pricing
        </Link>

        <div className="mt-8">
          <PremiumPaymentForm
            planName={premiumPlan.planName}
            formattedPrice={formatTzs(premiumPlan.amountTzs)}
            amountTzs={premiumPlan.amountTzs}
            billingPeriod={premiumPlan.billingPeriod}
            airtelLipaNamba={premiumPlan.airtelLipaNamba}
            accountReference={accountReference}
            checkoutConfigured={premiumPlan.checkoutConfigured}
          />
        </div>
      </div>
    </main>
  );
}
