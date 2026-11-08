import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageIntro } from "@/components/page-intro";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { SponsorshipReviewList } from "@/components/admin/sponsorship-review";
import { isAdminRequest } from "@/lib/services/admin";
import { listSponsorshipsForAdmin } from "@/lib/services/sponsorships";
import { countAdminQueues } from "@/lib/services/video-review";

export const metadata: Metadata = {
  title: "Sponsorships",
  robots: { index: false, follow: false },
};

async function AdminSponsorships() {
  // Non-admins see a plain 404, including the tabs.
  if (!(await isAdminRequest())) notFound();
  // "Now" splits live from scheduled bookings: read it per request.
  await connection();

  const [rows, counts] = await Promise.all([
    listSponsorshipsForAdmin(),
    countAdminQueues(),
  ]);
  const now = new Date();
  const serialised = rows.map((row) => ({
    ...row,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    bookedByEmail: row.bookedBy?.email ?? null,
  }));
  return (
    <>
      <AdminTabs active="sponsorships" counts={counts} />
      <SponsorshipReviewList rows={serialised} now={now.toISOString()} />
    </>
  );
}

export default function AdminSponsorshipPage() {
  return (
    <>
      <PageIntro
        title="Sponsorship"
        accent="review"
        description="Approve, schedule and take down paid placements."
      />
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 sm:px-6">
        <Suspense
          fallback={
            <p className="text-[12.5px] text-zinc-400">Loading bookings…</p>
          }
        >
          <AdminSponsorships />
        </Suspense>
      </main>
    </>
  );
}
