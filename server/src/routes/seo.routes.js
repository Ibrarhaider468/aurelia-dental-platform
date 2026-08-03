import { Router } from "express";
import { absoluteUrl, buildSitemapEntries } from "../utils/seo.js";

const router = Router();

router.get("/robots.txt", (_req, res) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");

  res.type("text/plain").send(body);
});

router.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const entries = await buildSitemapEntries();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${absoluteUrl(entry.path)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    res.type("application/xml").send(xml);
  } catch (error) {
    next(error);
  }
});

export default router;
