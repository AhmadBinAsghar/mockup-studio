import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nInit } from "@/i18n/I18nInit";
import { UI_LOCALE_INIT_SCRIPT } from "@/i18n/config";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/config/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website", description: SITE_DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: UI_LOCALE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nInit />
        {children}
      </body>
    </html>
  );
}
