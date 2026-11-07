import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Funnel_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://eizoki.com"),
  title: {
    default: "Eizoki - Premium AI Motion & Video Inspiration Library",
    template: "%s | Eizoki — AI Motion & Video Inspiration",
  },
  description:
    "A hand-curated visual discovery platform showcasing exceptional AI-generated videos, motion design, creative experiments, and product launch films from creators worldwide.",
  applicationName: "Eizoki",
  authors: [{ name: "Eizoki Editorial", url: "https://eizoki.com" }],
  creator: "Eizoki",
  publisher: "Eizoki",
  generator: "Next.js",
  keywords: [
    "AI motion design",
    "AI video inspiration",
    "generative motion",
    "AI video curation",
    "motion design",
    "creative experiments",
    "product launch videos",
    "UI motion",
    "kinetic typography",
    "3D neural simulations",
    "cinematic AI storytelling",
    "Sora",
    "Runway Gen-3",
    "Kling AI",
    "Luma Dream Machine",
    "Midjourney",
    "ComfyUI",
    "curated motion library",
    "design inspiration",
  ],
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://eizoki.com",
    siteName: "Eizoki",
    title: "Eizoki - Premium AI Motion & Video Inspiration Library",
    description:
      "A hand-curated visual discovery platform showcasing exceptional AI-generated videos, motion design, creative experiments, and product launch films.",
    images: [
      {
        url: "/eizoki.webp",
        width: 1200,
        height: 630,
        alt: "Eizoki — Hand-curated AI Motion & Video Inspiration Library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eizoki - Premium AI Motion & Video Inspiration Library",
    description:
      "A hand-curated visual discovery platform showcasing exceptional AI-generated videos, motion design, creative experiments, and product launch films.",
    images: ["/eizoki.webp"],
    creator: "@eizoki",
    site: "@eizoki",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/eizoki.webp", type: "image/webp" },
    ],
    apple: [{ url: "/eizoki.webp" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Design & Creative Inspiration",
  alternates: {
    canonical: "https://eizoki.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${funnelDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 selection:bg-zinc-100 selection:text-zinc-900">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
