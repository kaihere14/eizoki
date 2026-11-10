import { Suspense } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { SkeletonFeed } from "@/components/skeleton-feed";
import { VideoFeed } from "@/components/video-feed";
import { SectionLabel } from "@/components/video-link-grid";
import { blogPostPath, breadcrumbGraph, absoluteUrl, seoMetadata, videoPath } from "@/lib/seo";
import { blogPostsForCategory } from "@/lib/blog";
import { CATEGORY_LANDING_LIST, CATEGORY_LANDINGS } from "@/lib/seo-categories";
import {
  listLatestPublicVideos,
  listPublicVideoIndex,
  readForPage,
} from "@/lib/services/public-videos";
import { getLiveFeedSponsor } from "@/lib/services/sponsorships";
import { CATEGORY_LABELS, type VideoCategory } from "@/lib/videos";

const FEED_PAGE_SIZE = 24;

export function categoryMetadata(category: VideoCategory) {
  const landing = CATEGORY_LANDINGS[category];
  return seoMetadata({
    path: landing.path,
    title: landing.title,
    description: landing.description,
  });
}

function categoryGraph(category: VideoCategory) {
  const landing = CATEGORY_LANDINGS[category];
  const url = absoluteUrl(landing.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: landing.title,
        description: landing.description,
        inLanguage: "en",
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@type": "Thing", name: CATEGORY_LABELS[category] },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: landing.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

/** The first page of the category feed, rendered on the server. */
async function CategoryVideos({ category }: { category: VideoCategory }) {
  const data = await readForPage("Category feed", () =>
    Promise.all([
      listLatestPublicVideos({ category, limit: FEED_PAGE_SIZE + 1 }),
      getLiveFeedSponsor(),
    ]),
  );
  if (!data) return <VideoFeed category={category} />;

  const [videos, sponsor] = data;
  const hasMore = videos.length > FEED_PAGE_SIZE;
  const page = videos.slice(0, FEED_PAGE_SIZE);
  return (
    <VideoFeed
      category={category}
      initialPage={{
        videos: page,
        // The feed API pages after the last video id, newest first.
        nextCursor: hasMore ? page[page.length - 1].id : null,
        sponsor,
      }}
    />
  );
}

/** Every video in the category as a plain link, so all of them get crawled. */
async function CategoryIndex({ category }: { category: VideoCategory }) {
  const index = await readForPage("Category index", listPublicVideoIndex);
  const entries = index?.filter((entry) => entry.category === category) ?? [];
  if (entries.length === 0) return null;
  return (
    <section className="border-t border-zinc-200/80 pt-6">
      <SectionLabel>
        All {CATEGORY_LABELS[category]} videos ({entries.length})
      </SectionLabel>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.slug} className="min-w-0">
            <Link
              href={videoPath(entry.slug)}
              className="block truncate text-[13px] leading-relaxed text-zinc-600 underline-offset-2 hover:text-zinc-950 hover:underline"
            >
              {entry.title}
              <span className="text-zinc-400"> by {entry.creatorName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryLandingPage({ category }: { category: VideoCategory }) {
  const landing = CATEGORY_LANDINGS[category];
  const posts = blogPostsForCategory(category);
  const otherCategories = CATEGORY_LANDING_LIST.filter(
    (item) => item.category !== category,
  );

  return (
    <>
      <JsonLd data={categoryGraph(category)} />
      <JsonLd
        data={breadcrumbGraph([
          { name: "Eizoki", path: "/" },
          { name: CATEGORY_LABELS[category], path: landing.path },
        ])}
      />
      <PageIntro
        title={landing.headingLead}
        accent={landing.headingAccent}
        description={landing.summary}
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pb-24">
        <Suspense fallback={<SkeletonFeed spacious />}>
          <CategoryVideos category={category} />
        </Suspense>

        <div className="mx-auto mt-16 max-w-2xl space-y-8">
          <section className="border-t border-zinc-200/80 pt-6">
            <SectionLabel>About {CATEGORY_LABELS[category]}</SectionLabel>
            {landing.intro.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="mt-2.5 text-[13.5px] leading-[1.7] text-zinc-500"
              >
                {paragraph}
              </p>
            ))}
          </section>

          <section className="border-t border-zinc-200/80 pt-6">
            <SectionLabel>Questions</SectionLabel>
            <dl className="mt-3 space-y-4">
              {landing.faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-[13.5px] font-medium text-zinc-800">
                    {faq.question}
                  </dt>
                  <dd className="mt-1 text-[13.5px] leading-[1.7] text-zinc-500">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {posts.length > 0 && (
            <section className="border-t border-zinc-200/80 pt-6">
              <SectionLabel>From the blog</SectionLabel>
              <ul className="mt-3 space-y-2">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={blogPostPath(post.slug)}
                      className="text-[13.5px] font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 hover:decoration-zinc-500"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Suspense fallback={null}>
            <CategoryIndex category={category} />
          </Suspense>

          <nav
            aria-label="Other categories"
            className="border-t border-zinc-200/80 pt-6"
          >
            <SectionLabel>More categories</SectionLabel>
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {otherCategories.map((item) => (
                <li key={item.category}>
                  <Link
                    href={item.path}
                    className="block rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors hover:text-zinc-900"
                  >
                    {CATEGORY_LABELS[item.category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
    </>
  );
}
