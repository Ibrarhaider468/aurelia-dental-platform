import { Router } from "express";
import {
  absoluteUrl,
  websiteRoutesForSitemap,
} from "../utils/seo.js";

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

router.get("/sitemap.xml", (_req, res) => {
  const now = new Date().toISOString();
  const urls = websiteRoutesForSitemap().map((route) => ({
    loc: absoluteUrl(route.path),
    lastmod: now,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  res.type("application/xml").send(xml);
});

export default router;
