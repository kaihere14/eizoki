import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { VideoReviewList } from "@/components/admin/video-review";
import { isAdminRequest } from "@/lib/services/admin";
import { listVideosForReview } from "@/lib/services/video-review";

export const metadata: Metadata = {
  title: "Video review",
  robots: { index: false, follow: false },
};

async function AdminVideos() {
  // Non-admins see a plain 404. The layout checks too; this guards the page.
  if (!(await isAdminRequest())) notFound();

  const { rows, total } = await listVideosForReview();
  const serialised = rows.map(({ submittedBy, createdAt, ...row }) => ({
    ...row,
    createdAt: createdAt.toISOString(),
    submitterEmail: submittedBy.email,
  }));
  return <VideoReviewList rows={serialised} total={total} />;
}

export default function AdminVideosPage() {
  return (
    <Suspense
      fallback={
        <p className="text-[12.5px] text-zinc-400">Loading submissions…</p>
      }
    >
      <AdminVideos />
    </Suspense>
  );
}
