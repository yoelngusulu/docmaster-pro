import type { MetadataRoute } from "next";

const baseUrl = "https://docmaster-pro-lemon.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/checkout/",
        "/dashboard/",
        "/forgot-password/",
        "/history/",
        "/login/",
        "/logout/",
        "/register/",
        "/update-password/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
