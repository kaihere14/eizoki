import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import { FavouriteButton } from "@/components/favourite-button";
import { JsonLd } from "@/components/json-ld";
import { SectionLabel, VideoLinkGrid } from "@/components/video-link-grid";
import { videoReferencePath } from "@/lib/video-reference";
import {
  absoluteUrl,
  breadcrumbGraph,
  isoDuration,
  seoMetadata,
  SITE_NAME,
  snippet,
  tagPath,
  videoPath,
} from "@/lib/seo";
import { CATEGORY_LANDINGS } from "@/lib/seo-categories";
import {
  countPublicVideosByTag,
  getPublicVideoBySlug,
  listPublicVideoIndex,
  listRelatedVideos,
  MIN_TAG_PAGE_VIDEOS,
} from "@/lib/services/public-videos";
import {
  CATEGORY_LABELS,
  formatDuration,
  formatPublishedAt,
  originalVideoUrl,
  PROMPT_STATUS_BADGES,
  type VideoMetadata,
} from "@/lib/videos";
import { VIDEO_TAGS } from "@/lib/video-tags";

/** Returned when the database is unreachable at build; it renders a 404. */
const BUILD_PLACEHOLDER = "__placeholder__";

export async function generateStaticParams() {
  try {
    const index = await listPublicVideoIndex();
    if (index.length > 0) return index.map(({ slug }) => ({ slug }));
  } catch (error) {
    console.error("Video pages could not be listed at build", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  // Cache Components needs at least one param; unlisted slugs render on first visit.
  return [{ slug: BUILD_PLACEHOLDER }];
}

async function loadVideo(slug: string) {
  if (slug === BUILD_PLACEHOLDER) return null;
  return getPublicVideoBySlug(slug);
}

const TAG_LABELS: Record<string, string> = Object.fromEntries(
  VIDEO_TAGS.map((tag) => [tag.value, tag.label]),
);

function videoDescription(video: VideoMetadata) {
  if (video.description?.trim()) return snippet(video.description);
  const tools = video.toolsUsed?.length
    ? ` made with ${video.toolsUsed.slice(0, 3).join(", ")}`
    : "";
  const prompt =
    video.promptStatus === "unavailable"
      ? ""
      : " Read and copy the prompt behind it.";
  return snippet(
    `${video.title} by ${video.creator.name}: a hand-picked ${CATEGORY_LABELS[video.category]} video${tools}.${prompt}`,
  );
}

function pageTitle(video: VideoMetadata) {
  const kind =
    video.promptStatus === "unavailable" ? "video" : "video & prompt";
  return `${video.title} — ${CATEGORY_LABELS[video.category]} ${kind} | ${SITE_NAME}`;
}

export async function generateMetadata({
  params,
}: PageProps<"/v/[slug]">): Promise<Metadata> {
  const video = await loadVideo((await params).slug);
  if (!video) return { title: "Video not found" };
  return seoMetadata({
    path: videoPath(video.slug),
    title: pageTitle(video),
    description: videoDescription(video),
    type: "video.other",
    image: video.posterUrl
      ? { url: video.posterUrl, alt: `Still from ${video.title}` }
      : undefined,
    video: { url: video.videoUrl },
  });
}

function videoGraph(video: VideoMetadata) {
  const url = absoluteUrl(videoPath(video.slug));
  const profileUrl = video.creator.xProfileUrl ?? video.creator.profileUrl;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${url}#video`,
    url,
    name: video.title,
    description: videoDescription(video),
    // Google requires a thumbnail; the caller skips this graph without one.
    thumbnailUrl: [video.posterUrl],
    uploadDate: video.publishedAt,
    duration: isoDuration(video.durationSeconds),
    contentUrl: video.videoUrl,
    genre: CATEGORY_LABELS[video.category],
    keywords: video.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", ") || undefined,
    creator: {
      "@type": "Person",
      name: video.creator.name,
      ...(profileUrl ? { url: profileUrl } : {}),
    },
    isPartOf: { "@id": absoluteUrl("/#website") },
  };
}

const ACTION_LINK_CLASS =
  "flex items-center justify-between rounded-full border border-zinc-200/60 bg-white px-4 py-2.5 text-[12.5px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors duration-150 hover:text-zinc-950";

export default async function VideoPage({ params }: PageProps<"/v/[slug]">) {
  const video = await loadVideo((await params).slug);
  if (!video) notFound();

  const [related, tagCounts] = await Promise.all([
    listRelatedVideos(video, 6),
    countPublicVideosByTag(),
  ]);
  const landing = CATEGORY_LANDINGS[video.category];
  const status = PROMPT_STATUS_BADGES[video.promptStatus];
  const hasPrompt = Boolean(video.promptText?.trim());
  const profileUrl = video.creator.xProfileUrl ?? video.creator.profileUrl;
  const originalUrl = originalVideoUrl(video);
  const details = [
    { label: "Category", value: CATEGORY_LABELS[video.category] },
    { label: "Tools", value: video.toolsUsed?.length ? video.toolsUsed.join(", ") : "—" },
    { label: "Duration", value: formatDuration(video.durationSeconds) },
    { label: "Published", value: formatPublishedAt(video.publishedAt) },
  ];

  return (
    <>
      {video.posterUrl && <JsonLd data={videoGraph(video)} />}
      <JsonLd
        data={breadcrumbGraph([
          { name: "Eizoki", path: "/" },
          { name: CATEGORY_LABELS[video.category], path: landing.path },
          { name: video.title, path: videoPath(video.slug) },
        ])}
      />
      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex min-w-0 items-center gap-1 text-[12px] text-zinc-500">
            <li>
              <Link href="/" className="hover:text-zinc-900">
                Eizoki
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
            <li>
              <Link href={landing.path} className="hover:text-zinc-900">
                {CATEGORY_LABELS[video.category]}
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
            <li aria-current="page" className="min-w-0 truncate text-zinc-700">
              {video.title}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div
              className="mx-auto overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-950 shadow-[0_24px_80px_-36px_rgba(9,9,11,0.35)]"
              style={{
                aspectRatio: video.aspectRatio ?? 16 / 9,
                maxWidth: `calc(75dvh * ${video.aspectRatio ?? 16 / 9})`,
              }}
            >
              <video
                src={video.videoUrl}
                poster={video.posterUrl}
                controls
                loop
                playsInline
                preload="metadata"
                aria-label={`${video.title} by ${video.creator.name}`}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <aside className="w-full lg:w-[320px] lg:shrink-0">
            <h1 className="font-display text-[22px] font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-[24px]">
              {video.title}
            </h1>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              by{" "}
              {profileUrl ? (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
                >
                  {video.creator.name}
                </a>
              ) : (
                <span className="font-medium text-zinc-700">{video.creator.name}</span>
              )}
              {video.creator.handle && (
                <span className="text-zinc-400"> {video.creator.handle}</span>
              )}
            </p>
            {video.description && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-600">
                {video.description}
              </p>
            )}

            <div className="mt-5 space-y-2">
              <CopyPromptButton videoId={video.id} promptText={video.promptText} />
              <FavouriteButton videoId={video.id} videoTitle={video.title} />
              {originalUrl && (
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ACTION_LINK_CLASS}
                >
                  View original
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.9} aria-hidden="true" />
                </a>
              )}
            </div>

            <dl className="mt-5 border-t border-dashed border-zinc-300/70">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-5 border-b border-dashed border-zinc-300/70 py-2.5"
                >
                  <dt className="shrink-0 text-[12.5px] text-zinc-500">{row.label}</dt>
                  <dd className="max-w-[62%] text-right text-[12.5px] font-medium leading-relaxed text-zinc-800">
                    {row.label === "Category" ? (
                      <Link href={landing.path} className="hover:underline">
                        {row.value}
                      </Link>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Prompt
                </h2>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="mt-2 rounded-2xl border border-zinc-200/60 bg-white p-3.5">
                {hasPrompt ? (
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-600">
                    {video.promptText}
                  </p>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-zinc-500">
                    The creator has not shared a prompt for this video. Copy
                    prompt still gives you the reference video and a template
                    to describe it for your own project.
                  </p>
                )}
                <p className="mt-3 border-t border-zinc-100 pt-3 text-[12px] text-zinc-500">
                  <a
                    href={videoReferencePath(video.id)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                  >
                    Reference video
                  </a>
                </p>
              </div>
              {video.negativePrompt && (
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                  <span className="font-medium text-zinc-500">Negative:</span>{" "}
                  {video.negativePrompt}
                </p>
              )}
            </section>

            {video.tags.length > 0 && (
              <section className="mt-4">
                <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Tags
                </h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {video.tags.map((tag) => {
                    const label = TAG_LABELS[tag] ?? tag;
                    const linked =
                      (tagCounts as Record<string, number>)[tag] >= MIN_TAG_PAGE_VIDEOS;
                    const className =
                      "block rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10.5px] font-medium text-zinc-600";
                    return (
                      <li key={tag}>
                        {linked ? (
                          <Link href={tagPath(tag)} className={`${className} hover:text-zinc-900`}>
                            {label}
                          </Link>
                        ) : (
                          <span className={className}>{label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {video.curatorNotes && (
              <section className="mt-4 rounded-2xl border border-brand/15 bg-brand/[0.05] p-3.5">
                <h2 className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand/80">
                  Curator&apos;s note
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
                  {video.curatorNotes}
                </p>
              </section>
            )}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-zinc-200/80 pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <SectionLabel>More like this</SectionLabel>
              <Link
                href={landing.path}
                className="shrink-0 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900"
              >
                All {CATEGORY_LABELS[video.category]} →
              </Link>
            </div>
            <div className="mt-4">
              <VideoLinkGrid videos={related} />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
