import { Hero } from "@/components/hero";
import { CategoryBar } from "@/components/category-bar";
import { SkeletonFeed } from "@/components/skeleton-feed";

export default function Home() {
  return (
    <>
      <Hero />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <CategoryBar />
        <SkeletonFeed />
      </main>
    </>
  );
}
