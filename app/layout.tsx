import type { Metadata, Viewport } from "next";
import {
  HOME_TITLE,
  PUBLIC_ROBOTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  siteGraph,
} from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { Geist, Geist_Mono, Funnel_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { NavbarSponsors } from "@/components/navbar-sponsors";
import { LoginModalProvider } from "@/components/login-modal";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { UserProvider } from "@/components/user-provider";
import { Analytics } from "@vercel/analytics/next";
import { CookieConsent } from "@/components/cookie-consent";

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
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: "%s | Eizoki" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }] },
  robots: PUBLIC_ROBOTS,
  category: "Design & Creative Inspiration",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="dark"
      data-theme="blue"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${funnelDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <JsonLd data={siteGraph()} />
        {/* Dark blue is server-rendered on <html>; this applies a saved colour theme or light mode before first paint so there is no flash. */}
        <Script id="theme-boot" strategy="beforeInteractive">
          {`try{var d=document.documentElement;if(localStorage.getItem("eizoki:theme")==="pink"){d.dataset.theme="pink"}if(localStorage.getItem("eizoki:mode")==="light"){d.dataset.mode="light"}}catch(e){}`}
        </Script>
        <ThemeProvider>
          <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-in">
            <UserProvider>
              <LoginModalProvider>
                <Navbar sponsorSlot={<NavbarSponsors />} />
                {children}
                <SiteFooter />
              </LoginModalProvider>
            </UserProvider>
          </ClerkProvider>
        </ThemeProvider>
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}
