export interface PostSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date
  readingMinutes: number;
  tags: string[];
  sections: PostSection[];
}

export const POSTS: Post[] = [
  {
    slug: "app-store-screenshot-sizes",
    title: "App Store and Google Play Screenshot Sizes: A Practical Guide",
    description:
      "The screenshot dimensions and counts you need for the App Store and Google Play, and how to export every size from one design.",
    published: "2026-10-16",
    readingMinutes: 5,
    tags: ["App Store", "Google Play", "Screenshots"],
    sections: [
      {
        heading: "Why sizes trip people up",
        paragraphs: [
          "Both stores reject or distort screenshots that don't match their required dimensions. Each device class has its own size, so a single design usually has to be exported several times.",
          "Store requirements change over time, so treat the numbers below as a starting point and confirm them in App Store Connect and the Google Play Console before you submit.",
        ],
      },
      {
        heading: "Apple App Store",
        paragraphs: [
          "Apple lets you upload up to 10 screenshots per device size. Larger sizes are scaled down for smaller devices when you don't provide them, so start with the largest iPhone size.",
        ],
        list: [
          "iPhone 6.9-inch: 1320 × 2868 px",
          "iPhone 6.7-inch: 1290 × 2796 px",
          "iPad 13-inch: 2064 × 2752 px",
        ],
      },
      {
        heading: "Google Play",
        paragraphs: [
          "Google Play accepts 2 to 8 phone screenshots. Each side must be between 320 and 3840 px, and the longer side can be at most twice the shorter side. You also need a 1024 × 500 px feature graphic for your listing.",
        ],
      },
      {
        heading: "Export every size from one design",
        paragraphs: [
          "Design once, then export to each target. Mockup Studio lets you pick store presets or add custom sizes, then exports all of them together as a ZIP, entirely in your browser.",
        ],
      },
    ],
  },
  {
    slug: "app-screenshot-design-tips",
    title: "7 Tips for App Store Screenshots That Convert",
    description:
      "Simple design rules for app store screenshots: clear headlines, one idea per slide, readable text and consistent styling.",
    published: "2026-10-16",
    readingMinutes: 4,
    tags: ["Design", "ASO", "Conversion"],
    sections: [
      {
        heading: "Your screenshots are your sales pitch",
        paragraphs: [
          "Most people decide whether to install an app after glancing at the first few screenshots. They need to understand what the app does within seconds.",
        ],
      },
      {
        heading: "What works",
        paragraphs: ["These habits show up again and again in screenshot sets that perform well:"],
        list: [
          "Lead with your strongest benefit in the first slide.",
          "Use one idea and one short headline per slide.",
          "Keep headline text large enough to read at thumbnail size.",
          "Show the real interface, not an abstract illustration.",
          "Keep colors, fonts and layout consistent across the whole set.",
          "Make sure text has strong contrast against the background.",
          "Localize headlines for your biggest markets.",
        ],
      },
      {
        heading: "Do it faster",
        paragraphs: [
          "Pick a template once and apply it to every screenshot so your set stays consistent. Mockup Studio shows a live preview as you edit headlines, colors and fonts.",
        ],
      },
    ],
  },
  {
    slug: "private-screenshot-mockups-in-browser",
    title: "Why Browser-Based Screenshot Tools Keep Your App Private",
    description:
      "Unreleased app screens are sensitive. Here is why a tool that works entirely in your browser is safer than uploading them.",
    published: "2026-10-16",
    readingMinutes: 3,
    tags: ["Privacy", "Tools"],
    sections: [
      {
        heading: "Unreleased screens are confidential",
        paragraphs: [
          "Screenshots of a pre-launch app can reveal features, branding and plans. Uploading them to a third-party server means trusting that service with that information.",
        ],
      },
      {
        heading: "How browser-only tools differ",
        paragraphs: [
          "A tool that runs in your browser processes images on your own device. Your files are not sent to a server, so there is nothing to leak, retain or delete later.",
          "Mockup Studio works this way. Your projects are stored locally in your browser and exports are generated on your device. Read our privacy policy for the details.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
