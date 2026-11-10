import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SectionLabel } from "@/components/video-link-grid";
import { BLOG_BODIES } from "@/content/blog";
import { BLOG_POSTS, formatPostDate, getBlogPost, type BlogPost } from "@/lib/blog";
import {
  absoluteUrl,
  blogPostPath,
  breadcrumbGraph,
  seoMetadata,
  SITE_NAME,
} from "@/lib/seo";
import { CATEGORY_LANDINGS } from "@/lib/seo-categories";
import { CATEGORY_LABELS } from "@/lib/videos";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return { title: "Article not found" };
  return seoMetadata({
    path: blogPostPath(post.slug),
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
  });
}

function articleGraph(post: BlogPost) {
  const url = absoluteUrl(blogPostPath(post.slug));
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: "en",
    image: absoluteUrl("/opengraph-image.jpg"),
    author: { "@id": absoluteUrl("/#organization") },
    publisher: { "@id": absoluteUrl("/#organization") },
    isPartOf: { "@id": absoluteUrl("/#website") },
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const post = getBlogPost((await params).slug);
  const Body = post ? BLOG_BODIES[post.slug] : undefined;
  if (!post || !Body) notFound();

  const others = BLOG_POSTS.filter((item) => item.slug !== post.slug);

  return (
    <>
      <JsonLd data={articleGraph(post)} />
      <JsonLd
        data={breadcrumbGraph([
          { name: "Eizoki", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: blogPostPath(post.slug) },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-8 sm:pt-10 pb-24">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-[12px] text-zinc-500">
            <li>
              <Link href="/" className="hover:text-zinc-900">
                Eizoki
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 text-zinc-400" aria-hidden="true" />
            <li>
              <Link href="/blog" className="hover:text-zinc-900">
                Blog
              </Link>
            </li>
          </ol>
        </nav>

        <article className="mt-5">
          <header>
            <h1 className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] text-zinc-900 sm:text-[30px] text-balance">
              {post.title}
            </h1>
            <p className="mt-3 text-[12.5px] text-zinc-400">
              <time dateTime={post.publishedAt}>
                {formatPostDate(post.publishedAt)}
              </time>{" "}
              · {post.readingMinutes} min read · By the {SITE_NAME} team
            </p>
          </header>
          <div className="mt-7">
            <Body />
          </div>
        </article>

        <section className="mt-14 border-t border-zinc-200/80 pt-6">
          <SectionLabel>Browse the collection</SectionLabel>
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <li key={category}>
                <Link
                  href={CATEGORY_LANDINGS[category].path}
                  className="block rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors hover:text-zinc-900"
                >
                  {CATEGORY_LABELS[category]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {others.length > 0 && (
          <section className="mt-8 border-t border-zinc-200/80 pt-6">
            <SectionLabel>Keep reading</SectionLabel>
            <ul className="mt-3 space-y-2">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={blogPostPath(item.slug)}
                    className="text-[13.5px] font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 hover:decoration-zinc-500"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
