import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";
import { POSTS } from "@/content/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/upload", "/blog", "/privacy", "/terms", "/contact"].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
  const posts = POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.published,
  }));
  return [...pages, ...posts];
}
