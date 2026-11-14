import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-consent";
import { BLOG_POSTS } from "@/lib/blog";
import { blogPostPath } from "@/lib/seo";
import { CATEGORY_LANDING_LIST } from "@/lib/seo-categories";
import { CATEGORY_LABELS } from "@/lib/videos";

const LINK_CLASS =
  "text-[12.5px] text-zinc-500 transition-colors hover:text-zinc-900";

/**
 * Site-wide links to every category landing and guide. Besides helping
 * readers, this is how crawlers reach those pages from any URL.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        <nav aria-label="Categories">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Browse
          </h2>
          <ul className="mt-3 space-y-1.5">
            {CATEGORY_LANDING_LIST.map((landing) => (
              <li key={landing.category}>
                <Link href={landing.path} className={LINK_CLASS}>
                  {CATEGORY_LABELS[landing.category]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Guides">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Guides
          </h2>
          <ul className="mt-3 space-y-1.5">
            {BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <Link href={blogPostPath(post.slug)} className={LINK_CLASS}>
                  {post.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className={LINK_CLASS}>
                All articles
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Eizoki">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Eizoki
          </h2>
          <ul className="mt-3 space-y-1.5">
            <li>
              <Link href="/" className={LINK_CLASS}>
                Latest videos
              </Link>
            </li>
            <li>
              <Link href="/info" className={LINK_CLASS}>
                About
              </Link>
            </li>
            <li>
              <Link href="/sponsor" className={LINK_CLASS}>
                Sponsor
              </Link>
            </li>
            <li>
              <Link href="/cookies" className={LINK_CLASS}>
                Cookie policy
              </Link>
            </li>
            <li>
              <CookieSettingsButton className={LINK_CLASS} />
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
