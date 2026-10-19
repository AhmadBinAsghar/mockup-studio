export const SITE_NAME = "Mockup Studio";
export const LEGAL_UPDATED = "2026-10-16";

export const SITE_LINKS = [
  { href: "/blog", labelKey: "nav.blog" },
  { href: "/privacy", labelKey: "nav.privacy" },
  { href: "/terms", labelKey: "nav.terms" },
  { href: "/contact", labelKey: "nav.contact" },
] as const;

export const EMAILJS = {
  endpoint: "https://api.emailjs.com/api/v1.0/email/send",
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_DESCRIPTION =
  "Turn raw app screenshots into store-ready marketing images, entirely in your browser.";
