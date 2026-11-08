import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { PageIntro } from "@/components/page-intro";
import { SponsorshipReviewList } from "@/components/admin/sponsorship-review";
import { prisma } from "@/lib/prisma";
import { listSponsorshipsForAdmin } from "@/lib/services/sponsorships";

export const metadata: Metadata = {
  title: "Sponsorships",
  robots: { index: false, follow: false },
};

async function AdminSponsorships() {
  const { userId } = await auth();
  // Privilege comes from Postgres. Non-admins see a plain 404.
  const user = userId
    ? await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { isAdmin: true },
      })
    : null;
  if (!user?.isAdmin) notFound();

  const rows = await listSponsorshipsForAdmin();
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
    <SponsorshipReviewList rows={serialised} now={now.toISOString()} />
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
