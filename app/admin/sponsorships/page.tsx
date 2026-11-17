import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SponsorshipReviewList } from "@/components/admin/sponsorship-review";
import { isAdminRequest } from "@/lib/services/admin";
import { listSponsorshipsForAdmin } from "@/lib/services/sponsorships";

export const metadata: Metadata = {
  title: "Sponsorships",
  robots: { index: false, follow: false },
};

async function AdminSponsorships() {
  // Non-admins see a plain 404. The layout checks too; this guards the page.
  if (!(await isAdminRequest())) notFound();
  // "Now" splits live from scheduled bookings: read it per request.
  await connection();

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
  return <SponsorshipReviewList rows={serialised} now={now.toISOString()} />;
}

export default function AdminSponsorshipPage() {
  return (
    <Suspense
      fallback={<p className="text-[12.5px] text-zinc-400">Loading bookings…</p>}
    >
      <AdminSponsorships />
    </Suspense>
  );
}
