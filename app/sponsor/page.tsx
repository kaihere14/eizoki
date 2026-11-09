import { pageMetadata, pageGraph, PUBLIC_PAGES } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { Sponsorship } from "@/components/sponsorship";

export const metadata = pageMetadata(PUBLIC_PAGES.sponsor);

export default function SponsorPage() {
  return (
    <>
      <JsonLd data={pageGraph(PUBLIC_PAGES.sponsor)} />
      <PageIntro
        title="Sponsor"
        accent="Eizoki"
        description="Reach people who care about motion. Give your film a place in the feed, or your product a spot in the navbar."
      />
      <Sponsorship />
    </>
  );
}
