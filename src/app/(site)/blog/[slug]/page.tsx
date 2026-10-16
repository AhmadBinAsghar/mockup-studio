import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SITE_NAME, SITE_URL } from "@/config/site";
import { getPost, POSTS } from "@/content/posts";

export const instant = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} · ${SITE_NAME}`,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published,
      tags: post.tags,
    },
    twitter: { card: "summary", title: post.title, description: post.description },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    keywords: post.tags.join(", "),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <article className="flex flex-col gap-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/blog" className="hover:underline">
          ← All posts
        </Link>
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{post.title}</h1>
        <p className="text-xs text-muted-foreground">
          <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time> ·{" "}
          {post.readingMinutes} min read
        </p>
      </header>
      {post.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">{s.heading}</h2>
          {s.paragraphs.map((text) => (
            <p key={text} className="text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          ))}
          {s.list && (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              {s.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <aside className="rounded-xl border bg-muted p-4 text-sm">
        Ready to make yours?{" "}
        <Link href="/upload" className="font-semibold underline">
          Open {SITE_NAME}
        </Link>
        .
      </aside>
    </article>
  );
}
