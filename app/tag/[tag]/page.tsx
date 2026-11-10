import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { SectionLabel, VideoLinkGrid } from "@/components/video-link-grid";
import { absoluteUrl, breadcrumbGraph, seoMetadata, SITE_NAME, tagPath } from "@/lib/seo";
import { CATEGORY_LANDING_LIST } from "@/lib/seo-categories";
import {
  countPublicVideosByTag,
  listLatestPublicVideos,
  MIN_TAG_PAGE_VIDEOS,
} from "@/lib/services/public-videos";
import { CATEGORY_LABELS } from "@/lib/videos";
import { isVideoTag, VIDEO_TAGS, type VideoTag } from "@/lib/video-tags";

const TAG_PAGE_LIMIT = 60;

export function generateStaticParams() {
  return VIDEO_TAGS.map((tag) => ({ tag: tag.value }));
}

function tagLabel(tag: VideoTag) {
  return VIDEO_TAGS.find((item) => item.value === tag)?.label ?? tag;
}

/**
 * A tag page exists only once enough videos share the tag; thinner pages
 * would compete with the category pages without adding anything.
 */
async function indexableTag(value: string): Promise<VideoTag | null> {
  if (!isVideoTag(value)) return null;
  const counts = await countPublicVideosByTag();
  return counts[value] >= MIN_TAG_PAGE_VIDEOS ? value : null;
}

function tagCopy(tag: VideoTag) {
  const label = tagLabel(tag);
  return {
    title: `${label} AI Videos & Motion Design Examples | ${SITE_NAME}`,
    description: `Hand-picked ${label.toLowerCase()} AI videos and motion design, each credited to its creator, with prompts when they were shared.`,
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/tag/[tag]">): Promise<Metadata> {
  const tag = await indexableTag((await params).tag);
  if (!tag) return { title: "Tag not found" };
  const { title, description } = tagCopy(tag);
  return seoMetadata({ path: tagPath(tag), title, description });
}

export default async function TagPage({ params }: PageProps<"/tag/[tag]">) {
  const tag = await indexableTag((await params).tag);
  if (!tag) notFound();

  const videos = await listLatestPublicVideos({ tag, limit: TAG_PAGE_LIMIT });
  const label = tagLabel(tag);
  const { title, description } = tagCopy(tag);
  const url = absoluteUrl(tagPath(tag));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${url}#webpage`,
          url,
          name: title,
          description,
          inLanguage: "en",
          isPartOf: { "@id": absoluteUrl("/#website") },
        }}
      />
      <JsonLd
        data={breadcrumbGraph([
          { name: "Eizoki", path: "/" },
          { name: label, path: tagPath(tag) },
        ])}
      />
      <PageIntro title={label} accent="AI videos" description={description} />
      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-24">
        <VideoLinkGrid videos={videos} />
        <nav
          aria-label="Categories"
          className="mx-auto mt-14 max-w-2xl border-t border-zinc-200/80 pt-6"
        >
          <SectionLabel>Browse by category</SectionLabel>
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {CATEGORY_LANDING_LIST.map((item) => (
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
      </main>
    </>
  );
}
