import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { RefreshCacheButton } from "@/components/admin/refresh-cache-button";
import { isAdminRequest } from "@/lib/services/admin";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { countAdminQueues } from "@/lib/services/video-review";

export const metadata: Metadata = {
  title: "Review",
  robots: PRIVATE_ROBOTS,
};

/** The tabs and tools shared by every admin queue. */
async function AdminHeader() {
  // Non-admins see a plain 404, including the tabs.
  if (!(await isAdminRequest())) notFound();
  const counts = await countAdminQueues();
  return (
    <div className="mb-8 flex flex-col items-center gap-4">
      <AdminTabs counts={counts} />
      <RefreshCacheButton />
    </div>
  );
}

/**
 * The admin shell stays mounted while switching tabs: only the queue below
 * the tabs (the page) changes.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <PageIntro
        title="Admin"
        accent="review"
        description="Approve submissions and sponsorships before they go live."
      />
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 sm:px-6">
        <Suspense fallback={<div className="mb-8 h-[74px]" aria-hidden="true" />}>
          <AdminHeader />
        </Suspense>
        {children}
      </main>
    </>
  );
}
