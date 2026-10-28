import GoogleAd from "@/components/GoogleAd";
import { canServeAdsForCurrentUser } from "@/lib/ads/visibility";

type ConditionalGoogleAdProps = {
  slot?: string;
  className?: string;
};

export default async function ConditionalGoogleAd({
  slot,
  className,
}: ConditionalGoogleAdProps) {
  if (!slot || !(await canServeAdsForCurrentUser())) {
    return null;
  }

  return <GoogleAd slot={slot} className={className} />;
}