"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SITE_LINKS, SITE_NAME } from "@/config/site";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useT } from "@/i18n/useT";

export function SiteShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 lg:p-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-xl font-extrabold">
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("site.backToApp")}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t py-4 text-xs text-muted-foreground">
      {SITE_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-foreground hover:underline">
          {t(l.labelKey)}
        </Link>
      ))}
    </footer>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
