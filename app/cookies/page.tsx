import { pageMetadata, pageGraph, PUBLIC_PAGES } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { CookieSettingsButton } from "@/components/cookie-consent";

export const metadata = pageMetadata(PUBLIC_PAGES.cookies);

const LAST_UPDATED = "November 14, 2026";

type StorageItem = { name: string; purpose: string };

const ESSENTIAL: StorageItem[] = [
  {
    name: "Clerk session cookies",
    purpose:
      "Keep you signed in and protect your account. Set by Clerk, our sign-in provider, only when you sign in.",
  },
  {
    name: "eizoki:theme, eizoki:mode",
    purpose: "Remember the colour theme and light or dark mode you picked.",
  },
  {
    name: "eizoki:auth-return",
    purpose:
      "Remembers the page you were on while you sign in, so you land back there. Cleared when you close the tab.",
  },
  {
    name: "eizoki:analytics-consent",
    purpose: "Remembers whether you accepted or declined analytics cookies.",
  },
];

const ANALYTICS: StorageItem[] = [
  {
    name: "PostHog (ph_… cookie and local storage)",
    purpose:
      "A random ID that lets us tell returning visitors apart and group the pages you view into a visit.",
  },
];

const SECTION_CLASS = "border-t border-zinc-200/80 pt-6";
const HEADING_CLASS =
  "font-display text-[15px] font-semibold tracking-[-0.01em] text-zinc-900";
const BODY_CLASS = "mt-2.5 text-[13.5px] leading-[1.7] text-zinc-500";

function StorageList({ items }: { items: StorageItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200 bg-white">
      {items.map((item) => (
        <li key={item.name} className="px-4 py-3">
          <p className="font-mono text-[12px] text-zinc-800">{item.name}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">
            {item.purpose}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={pageGraph(PUBLIC_PAGES.cookies)} />
      <PageIntro
        title="Cookie"
        accent="policy"
        description="What Eizoki stores in your browser, why, and how to change your choice."
      />
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pb-24">
        <div className="space-y-8">
          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>What we mean by cookies</h2>
            <p className={BODY_CLASS}>
              Cookies are small files a website saves in your browser. Sites
              can also use local storage and session storage, which work the
              same way. On this page, &ldquo;cookies&rdquo; covers all three.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>Essential, always on</h2>
            <p className={BODY_CLASS}>
              These are needed for the site to work or to remember choices you
              made. They are never used to track you, so they do not need your
              consent.
            </p>
            <StorageList items={ESSENTIAL} />
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>Analytics, only if you accept</h2>
            <p className={BODY_CLASS}>
              We use PostHog to understand how Eizoki is used, such as which
              pages people visit, which videos are favourited, when prompts are
              copied and when something breaks. When you are signed in, this is
              linked to your account, including your email address and name.
              Nothing here loads until you press Accept, and declining removes
              what PostHog had saved.
            </p>
            <StorageList items={ANALYTICS} />
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>Cookieless page counts</h2>
            <p className={BODY_CLASS}>
              Vercel Analytics counts page views without cookies or any stored
              ID, so it cannot recognise you across visits. It runs whatever
              you choose.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>What we never do</h2>
            <p className={BODY_CLASS}>
              Eizoki has no advertising cookies or tracking pixels, and we do
              not sell your data or share it for advertising.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>Changing your choice</h2>
            <p className={BODY_CLASS}>
              You can accept or decline analytics at any time from Cookie
              settings, here or in the footer. You can also clear or block
              cookies in your browser settings; blocking essential cookies will
              sign you out.
            </p>
            <CookieSettingsButton className="mt-4 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-600 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand" />
          </section>
        </div>

        <p className="mt-10 text-center text-[11.5px] text-zinc-400">
          Last updated {LAST_UPDATED}
        </p>
      </main>
    </>
  );
}
