import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { PublicVideoFeed } from "@/components/public-video-feed";
import { SkeletonFeed } from "@/components/skeleton-feed";
import { pageGraph, pageMetadata, PUBLIC_PAGES } from "@/lib/seo";
import { Hero } from "@/components/hero";
import { CategoryBar } from "@/components/category-bar";

export const metadata = pageMetadata(PUBLIC_PAGES.home);

export default function Home() {
  return (
    <>
      <JsonLd data={pageGraph(PUBLIC_PAGES.home)} />
      <Hero />
      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pb-24">
        <CategoryBar />
        <Suspense fallback={<SkeletonFeed spacious />}>
          <PublicVideoFeed />
        </Suspense>
      </main>
    </>
  );
}
