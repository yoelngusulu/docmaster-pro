import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/tools/gis/bearing-azimuth-calculator",
        destination: "/tools/gis/distance-area-calculator",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "docmaster-pro-lemon.vercel.app",
          },
        ],
        destination: "https://yaju-tools.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
