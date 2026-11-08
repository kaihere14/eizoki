import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { MyVideos } from "@/components/my-videos";

export const metadata: Metadata = {
  title: "My Videos",
  robots: { index: false, follow: false },
};

export default function MyVideosPage() {
  return (
    <>
      <PageIntro
        title="My"
        accent="videos"
        description="Your uploads, from the review queue to the collection."
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 sm:px-6 lg:px-8">
        <MyVideos />
      </main>
    </>
  );
}
