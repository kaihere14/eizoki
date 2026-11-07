import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Favourites",
  description:
    "A private shelf for the AI motion worth revisiting. Favourites are being built.",
};

export default function FavouritesPage() {
  return (
    <>
      <PageIntro
        title="Your"
        accent="favourites"
        description="A private shelf for the films, prompts and creators worth coming back to. It is being built right now."
      />
      <main className="mx-auto w-full max-w-xl px-4 sm:px-6 pb-24">
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            In progress
          </span>
          <h2 className="mt-4 font-display text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
            Coming soon
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-[1.6] text-zinc-500 text-balance">
            Saving a motion, collecting a shelf, and syncing it to your account
            are on the way. Nothing to show here yet.
          </p>
        </div>
      </main>
    </>
  );
}
