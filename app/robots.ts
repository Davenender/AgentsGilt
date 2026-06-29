import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: "https://agents-gilt.agency/sitemap.xml",
    host: "https://agents-gilt.agency",
  };
}
