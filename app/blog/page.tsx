import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";
import { blogPostPath, pageGraph, pageMetadata, PUBLIC_PAGES } from "@/lib/seo";

export const metadata = pageMetadata(PUBLIC_PAGES.blog);

export default function BlogIndexPage() {
  return (
    <>
      <JsonLd data={pageGraph(PUBLIC_PAGES.blog)} />
      <PageIntro
        title="Guides to"
        accent="AI motion"
        description="How AI motion design, AI video prompts and launch films are made, with real examples from the collection."
      />
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pb-24">
        <ul className="space-y-2">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                href={blogPostPath(post.slug)}
                className="group block border-t border-zinc-200/80 pt-6 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <h2 className="font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] text-zinc-900 group-hover:underline group-hover:decoration-zinc-300 group-hover:underline-offset-4">
                  {post.title}
                </h2>
                <p className="mt-2 text-[13.5px] leading-[1.7] text-zinc-500">
                  {post.description}
                </p>
                <p className="mt-2.5 text-[12px] text-zinc-400">
                  <time dateTime={post.publishedAt}>
                    {formatPostDate(post.publishedAt)}
                  </time>{" "}
                  · {post.readingMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
