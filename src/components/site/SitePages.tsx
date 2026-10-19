"use client";

import Link from "next/link";

import { ContactForm } from "@/components/site/ContactForm";
import { LegalSection } from "@/components/site/SiteShell";
import { LEGAL_UPDATED, SITE_NAME } from "@/config/site";
import { localizePost } from "@/content/localizePost";
import { getPost, POSTS } from "@/content/posts";
import { tRich } from "@/i18n/rich";
import { useT } from "@/i18n/useT";

function useDateFormat() {
  const { locale } = useT();
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
}

function link(href: string) {
  return function LinkTag(text: string) {
    return (
      <Link href={href} className="underline">
        {text}
      </Link>
    );
  };
}

export function ContactPageBody() {
  const { t } = useT();
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("contact.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("contact.intro")}</p>
      </div>
      <ContactForm />
    </>
  );
}

export function BlogIndexBody() {
  const tr = useT();
  const { t } = tr;
  const dateFormat = useDateFormat();
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("blog.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("blog.intro")}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {POSTS.map((post) => localizePost(post, tr)).map((p) => (
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
                {t("blog.minRead", { count: p.readingMinutes })}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PostBody({ slug }: { slug: string }) {
  const tr = useT();
  const { t } = tr;
  const dateFormat = useDateFormat();
  const source = getPost(slug);
  if (!source) return null;
  const post = localizePost(source, tr);
  return (
    <>
      <nav aria-label={t("blog.breadcrumb")} className="text-xs text-muted-foreground">
        <Link href="/blog" className="hover:underline">
          {t("blog.allPosts")}
        </Link>
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{post.title}</h1>
        <p className="text-xs text-muted-foreground">
          <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time> ·{" "}
          {t("blog.minRead", { count: post.readingMinutes })}
        </p>
      </header>
      {post.sections.map((s, i) => (
        <section key={i} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">{s.heading}</h2>
          {s.paragraphs.map((text, j) => (
            <p key={j} className="text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          ))}
          {s.list && (
            <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted-foreground">
              {s.list.map((item, k) => (
                <li key={k}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <aside className="rounded-xl border bg-muted p-4 text-sm">
        {tRich(
          tr,
          "blog.cta",
          {
            link: (text) => (
              <Link href="/upload" className="font-semibold underline">
                {text}
              </Link>
            ),
          },
          { site: SITE_NAME },
        )}
      </aside>
    </>
  );
}

function LegalHeader({ title }: { title: string }) {
  const { t } = useT();
  const dateFormat = useDateFormat();
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="text-xs text-muted-foreground">
        {t("legal.updated", { date: dateFormat.format(new Date(LEGAL_UPDATED)) })}
      </p>
    </div>
  );
}

function LegalSections({ page, count }: { page: "privacy" | "terms"; count: number }) {
  const tr = useT();
  const { t } = tr;
  return Array.from({ length: count }, (_, i) => i + 1).map((n) => (
    <LegalSection key={n} title={t(`${page}.s${n}.title`)}>
      <p>
        {tRich(
          tr,
          `${page}.s${n}.body`,
          { contact: link("/contact"), privacy: link("/privacy") },
          { site: SITE_NAME },
        )}
      </p>
    </LegalSection>
  ));
}

export function PrivacyBody() {
  const { t } = useT();
  return (
    <>
      <LegalHeader title={t("privacy.title")} />
      <LegalSections page="privacy" count={8} />
    </>
  );
}

export function TermsBody() {
  const { t } = useT();
  return (
    <>
      <LegalHeader title={t("terms.title")} />
      <LegalSections page="terms" count={7} />
    </>
  );
}
