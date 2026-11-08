import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { VideoReviewList } from "@/components/admin/video-review";
import { isAdminRequest } from "@/lib/services/admin";
import {
  countAdminQueues,
  listVideosForReview,
} from "@/lib/services/video-review";

export const metadata: Metadata = {
  title: "Video review",
  robots: { index: false, follow: false },
};

async function AdminVideos() {
  // Non-admins see a plain 404, including the tabs.
  if (!(await isAdminRequest())) notFound();

  const [{ rows, total }, counts] = await Promise.all([
    listVideosForReview(),
    countAdminQueues(),
  ]);
  const serialised = rows.map(({ submittedBy, createdAt, ...row }) => ({
    ...row,
    createdAt: createdAt.toISOString(),
    submitterEmail: submittedBy.email,
  }));
  return (
    <>
      <AdminTabs active="videos" counts={counts} />
      <VideoReviewList rows={serialised} total={total} />
    </>
  );
}

export default function AdminVideosPage() {
  return (
    <>
      <PageIntro
        title="Video"
        accent="review"
        description="Approve or decline community submissions before they reach the feed."
      />
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 sm:px-6">
        <Suspense
          fallback={
            <p className="text-[12.5px] text-zinc-400">Loading submissions…</p>
          }
        >
          <AdminVideos />
        </Suspense>
      </main>
    </>
  );
}
