import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { Sponsorship } from "@/components/sponsorship";

export const metadata: Metadata = {
  title: "Sponsor",
  description:
    "Put your video or product in front of the Eizoki community. Explore featured video and navbar sponsorships.",
  alternates: { canonical: "/sponsor" },
};

export default function SponsorPage() {
  return (
    <>
      <PageIntro
        title="Sponsor"
        accent="Eizoki"
        description="Reach people who care about motion. Give your film a place in the feed, or your product a spot in the navbar."
      />
      <Sponsorship />
    </>
  );
}
