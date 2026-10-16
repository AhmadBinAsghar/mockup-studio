import type { Metadata } from "next";
import Link from "next/link";

import { POSTS } from "@/content/posts";

export const metadata: Metadata = {
  title: "Blog · Mockup Studio",
  description:
    "Guides on app store screenshot sizes, design tips and privacy for making store-ready marketing images.",
  alternates: { canonical: "/blog" },
};

export const instant = false;

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Blog</h1>
        <p className="text-sm text-muted-foreground">
          Guides for making app store screenshots that look great and meet store requirements.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <article className="flex flex-col gap-1.5 rounded-xl border p-4">
              <h2 className="text-lg font-bold">
                <Link href={`/blog/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={p.published}>{dateFormat.format(new Date(p.published))}</time> ·{" "}
                {p.readingMinutes} min read
              </p>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
