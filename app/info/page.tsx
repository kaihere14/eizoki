import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { CATEGORY_LABELS } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Info",
  description:
    "About Eizoki — a hand-curated catalogue of AI motion, motion design and launch films worth watching.",
};

const SECTIONS = [
  {
    heading: "What Eizoki is",
    body: "Eizoki is a curated catalogue of AI-generated motion, motion design, product launch films and creative experiments from creators across the web. Every entry is reviewed by hand before it appears, so the feed stays short and worth scrolling.",
  },
  {
    heading: "What it isn't",
    body: "Eizoki does not generate video and does not compete with the tools that do. It is a curator, not a generator: the work is made by human creators using AI workflows, and our job is to find it, credit it and present it well.",
  },
  {
    heading: "How curation works",
    body: "Quality over volume. A piece has to earn its place — a clear point of view, craft in the motion, and something worth learning from. Anything generic, repetitive or low-effort is left out, even when it is popular.",
  },
  {
    heading: "Attribution and prompts",
    body: "Every entry credits its creator and links to the original post or portfolio. Prompts appear only when they can be sourced honestly: marked Original when shared by the creator, Reconstructed when rebuilt from their notes, and Not shared when unavailable.",
  },
] as const;

export default function InfoPage() {
  return (
    <>
      <PageIntro
        title="About"
        accent="Eizoki"
        description="A hand-curated visual discovery platform for AI motion, motion design and launch films worth watching."
      />
      <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pb-24">
        <div className="space-y-8">
          {SECTIONS.map((section, index) => (
            <section
              key={section.heading}
              className="border-t border-zinc-200/80 pt-6"
            >
              <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
                {section.heading}
              </h2>
              <p className="mt-2.5 text-[13.5px] leading-[1.7] text-zinc-500">
                {section.body}
              </p>
              {index === 1 && (
                <blockquote className="mt-5 border-l-2 border-[#3074FE] pl-4">
                  <p className="font-display text-[13.5px] leading-[1.6] font-medium text-zinc-800">
                    50 exceptional videos are more valuable than 5,000 mediocre
                    ones.
                  </p>
                </blockquote>
              )}
            </section>
          ))}

          <section className="border-t border-zinc-200/80 pt-6">
            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-zinc-900">
              Categories
            </h2>
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {Object.values(CATEGORY_LABELS).map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(9,9,11,0.04)]"
                >
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-[11.5px] text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3074FE]" />
          Eizoki is in active development.
        </p>
      </main>
    </>
  );
}
