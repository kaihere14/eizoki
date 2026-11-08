import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { Favourites } from "@/components/favourites";

export const metadata: Metadata = {
  title: "Favourites",
  description:
    "A private shelf for the AI motion worth revisiting, saved to your account.",
  robots: { index: false, follow: false },
};

export default function FavouritesPage() {
  return (
    <>
      <PageIntro
        title="Your"
        accent="favourites"
        description="A private shelf for the films, prompts and creators worth coming back to."
      />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 sm:px-6 lg:px-8">
        <Favourites />
      </main>
    </>
  );
}
