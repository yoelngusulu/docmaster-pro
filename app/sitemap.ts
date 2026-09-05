import type { MetadataRoute } from "next";

const baseUrl = "https://docmaster-pro-lemon.vercel.app";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

type SitemapRoute = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const routes: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tools", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/pdf", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/image", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tools/ai", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tools/gis", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tools/coordinates-converter", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/compress-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/merge-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-excel", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-image", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-powerpoint", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-word", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/protect-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/split-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/unlock-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/word-to-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/image/compress-image", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/image/image-to-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/background-remover", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/chat-with-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/face-retouch", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/image-colorizer", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/image-editor", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/image-to-text", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/image-upscaler", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/object-remover", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/photo-enhancer", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/resume-builder", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/summarize-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/ai/translate-document", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/gis/bearing-azimuth-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/gis/distance-area-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
