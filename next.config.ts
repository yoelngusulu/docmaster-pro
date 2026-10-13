import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/tools/gis/bearing-azimuth-calculator",
        destination: "/tools/gis/distance-area-calculator",
        permanent: true,
      },
];
  },
};

export default nextConfig;
