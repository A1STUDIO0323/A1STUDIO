import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/intake", "/intake/", "/api/intake/", "/admin", "/admin/", "/api/admin/"],
      },
    ],
  };
}
