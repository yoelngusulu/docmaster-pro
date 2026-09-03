"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type GoogleAdProps = {
  slot?: string;
  className?: string;
};

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-4368066697517385";

export default function GoogleAd({
  slot,
  className = "",
}: GoogleAdProps) {
  useEffect(() => {
    if (!slot) {
      return;
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers or unavailable AdSense scripts should not break the page.
    }
  }, [slot]);

  if (!slot) {
    return null;
  }

  return (
    <div
      className={`mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-4 text-center shadow-sm ${className}`}
      aria-label="Advertisement"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Advertisement
      </p>

      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
