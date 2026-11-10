import type { VideoCategory } from "@/lib/videos";

/**
 * Search-facing copy for each category landing page. Each page targets the
 * phrases people actually type ("AI motion design", "kinetic typography"),
 * so the title, heading and intro say them plainly. Keep the copy true to how
 * Eizoki works: hand-curated, credited, prompts labelled honestly.
 */
export type CategoryLanding = {
  category: VideoCategory;
  /** Path of the landing page; the category slug at the site root. */
  path: `/${VideoCategory}`;
  /** Full <title>, used as is. Aim for 60 characters or fewer. */
  title: string;
  /** Meta description. Aim for 160 characters or fewer. */
  description: string;
  /** Heading text before the highlighted words. */
  headingLead: string;
  /** Highlighted words of the heading: the main search phrase. */
  headingAccent: string;
  /** What one video in the category is called in titles: "AI launch video". */
  videoNoun: string;
  /** One sentence under the heading. */
  summary: string;
  /** Longer copy shown under the feed. */
  intro: string[];
  faqs: { question: string; answer: string }[];
};

export const CATEGORY_LANDINGS: Record<VideoCategory, CategoryLanding> = {
  "ai-motion-design": {
    category: "ai-motion-design",
    path: "/ai-motion-design",
    videoNoun: "AI motion design",
    title: "AI Motion Design Examples, Videos & Prompts | Eizoki",
    description:
      "Hand-picked AI motion design: AI motion graphics, abstract loops and title sequences, each credited to its creator, with prompts when they were shared.",
    headingLead: "Hand-picked",
    headingAccent: "AI motion design",
    summary:
      "AI motion graphics, abstract loops and title studies from creators across the web, each reviewed by hand before it appears.",
    intro: [
      "AI motion design is motion graphics made with generative video tools: abstract loops, logo reveals, title sequences, transitions and product visuals, where a model generates or animates the frames and a designer directs the look, timing and edit.",
      "This page collects the AI motion work we think is worth studying. Every piece is credited to its creator and links to the original post. Where the creator shared a prompt, you can read it and copy it as a template for your own project; prompts we rebuilt from the creator's notes are labelled Reconstructed.",
    ],
    faqs: [
      {
        question: "What is AI motion design?",
        answer:
          "Motion graphics made with generative AI video tools. The model produces or animates the frames; the designer chooses the concept, style, camera, pacing and final edit.",
      },
      {
        question: "Can I reuse the prompts on this page?",
        answer:
          "Yes, as a starting point. The copy button adds the reference video and a note to adapt every brand detail to your own project, since each prompt was written for someone else's work.",
      },
      {
        question: "How are videos chosen?",
        answer:
          "Each submission is reviewed by hand. We look for a clear point of view and craft in the motion, and leave out generic or repetitive clips even when they are popular.",
      },
    ],
  },
  "launch-videos": {
    category: "launch-videos",
    path: "/launch-videos",
    videoNoun: "AI launch video",
    title: "AI Product Launch Video Examples & Prompts | Eizoki",
    description:
      "Product launch videos and promo films made with AI video tools. Study the pacing, UI reveals and prompts behind launch films that work.",
    headingLead: "Product",
    headingAccent: "launch videos",
    summary:
      "Launch films, feature reveals and SaaS promos made with AI video tools, picked for pacing and clarity.",
    intro: [
      "A launch video has seconds to say what a product is and why it matters. The best ones open on a strong visual, show the product early, keep each shot short and end on one clear call to action.",
      "These launch and promo videos were made fully or partly with AI video tools. Use them as references for structure, pacing and transitions. When a creator shared their prompt, the copy button turns it into a template for your own product, with the reference video attached.",
    ],
    faqs: [
      {
        question: "Can AI make a product launch video?",
        answer:
          "AI video tools can generate shots, transitions and product visuals, and many launch films on this page were made that way. Most still need a human edit, real product UI and a clear script.",
      },
      {
        question: "How long should a launch video be?",
        answer:
          "Most launch films here run well under a minute. Social feeds reward the first two or three seconds, so lead with the product or the problem it solves.",
      },
    ],
  },
  "3d-experiments": {
    category: "3d-experiments",
    path: "/3d-experiments",
    videoNoun: "AI 3D animation",
    title: "AI 3D Animation & 3D Motion Experiments | Eizoki",
    description:
      "AI 3D animation, material studies, simulations and 3D motion experiments, hand-curated and credited to their creators, with prompts when shared.",
    headingLead: "AI",
    headingAccent: "3D animation",
    summary:
      "Material studies, simulations and 3D motion experiments made with AI tools, often mixed with traditional 3D software.",
    intro: [
      "AI 3D animation covers work where generative models create or restyle three-dimensional scenes: material and lighting studies, physics-like simulations, product renders and camera moves through spaces that were never modelled by hand.",
      "Many of these pieces combine AI with conventional 3D tools. The tools list on each video says what the creator used, and the prompt, when shared, shows how they described the materials, light and camera.",
    ],
    faqs: [
      {
        question: "Is this made in Blender or with AI?",
        answer:
          "Sometimes both. Each video lists the tools its creator named, so you can see which parts came from a generative model and which from 3D software.",
      },
    ],
  },
  "ui-motion": {
    category: "ui-motion",
    path: "/ui-motion",
    videoNoun: "UI motion design",
    title: "UI Motion Design & App Animation Examples | Eizoki",
    description:
      "UI motion design examples: app animations, interface transitions and product UI films, hand-picked and credited, with prompts when available.",
    headingLead: "UI",
    headingAccent: "motion design",
    summary:
      "Interface animations, app transitions and product UI films that show how motion explains a product.",
    intro: [
      "UI motion design is animation inside or about a digital interface: screen transitions, micro-interactions, onboarding flows and product UI films. Good UI motion explains what changed and where to look next.",
      "This collection mixes AI-assisted UI animation with interface films for real products. Use it to study timing, easing and how a screen moves from one state to the next, then copy a prompt as a template when one is shared.",
    ],
    faqs: [
      {
        question: "What makes good UI motion?",
        answer:
          "Short, purposeful movement that shows cause and effect: where an element came from, what changed and where attention should go. Decoration that slows the user down is left out.",
      },
    ],
  },
  "kinetic-typography": {
    category: "kinetic-typography",
    path: "/kinetic-typography",
    videoNoun: "kinetic typography",
    title: "Kinetic Typography Examples & AI Text Animation | Eizoki",
    description:
      "Kinetic typography and text animation examples, including AI-assisted type in motion, curated by hand and credited to each creator.",
    headingLead: "Kinetic",
    headingAccent: "typography",
    summary:
      "Type in motion: text animation, animated titles and AI-assisted kinetic typography, picked for rhythm and legibility.",
    intro: [
      "Kinetic typography is text that moves to carry meaning: words timed to a voice or beat, titles that build and break apart, and layouts that animate between states. It is one of the hardest things for generative models to do well, which makes the good examples worth studying.",
      "The pieces here range from fully AI-generated type to hand-animated titles with AI backgrounds. Each one credits its creator and lists the tools used.",
    ],
    faqs: [
      {
        question: "Can AI video tools animate text?",
        answer:
          "Increasingly, though legible, correctly spelled text is still difficult. Many creators generate the motion with AI and set the final type in an editor or motion design tool.",
      },
    ],
  },
  "cinematic-stories": {
    category: "cinematic-stories",
    path: "/cinematic-stories",
    videoNoun: "cinematic AI video",
    title: "AI Cinematic Videos & AI Short Films | Eizoki",
    description:
      "Cinematic AI videos and short films: AI storytelling, film-look shots and visual narratives, hand-curated and credited to their creators.",
    headingLead: "Cinematic",
    headingAccent: "AI films",
    summary:
      "AI short films, cinematic shots and visual stories with a strong sense of camera, light and mood.",
    intro: [
      "Cinematic AI video borrows the language of film: deliberate camera moves, motivated light, a consistent look and shots that cut together into a story. The craft is in keeping characters, style and pacing consistent across many generated shots.",
      "This collection gathers AI short films and cinematic sequences worth watching for their direction. When a creator shared their prompts, you can read how they described the camera, lens and lighting.",
    ],
    faqs: [
      {
        question: "How do creators keep AI shots consistent?",
        answer:
          "Usually with reference images, a fixed style description repeated across prompts and careful editing. Prompts shared on each video show the exact wording when the creator made it public.",
      },
    ],
  },
  "creative-experiments": {
    category: "creative-experiments",
    path: "/creative-experiments",
    videoNoun: "experimental AI video",
    title: "Experimental AI Video & Generative Art Films | Eizoki",
    description:
      "Experimental AI video, generative art and creative experiments: glitch, audio-reactive and analog-look motion, hand-picked and credited.",
    headingLead: "Experimental",
    headingAccent: "AI video",
    summary:
      "Generative art, glitch, audio-reactive and analog-look experiments that push what AI video tools can do.",
    intro: [
      "Not every AI video needs a brief. This collection is for experiments: generative art loops, glitch and datamosh looks, audio-reactive pieces and odd techniques that show a tool doing something it was not designed for.",
      "Experiments are often where new styles start. Each piece credits its creator and, when shared, includes the prompt or process behind it.",
    ],
    faqs: [
      {
        question: "What counts as an experiment?",
        answer:
          "Work made to explore a technique or look rather than to sell or tell a story: generative loops, glitch, audio-reactive visuals and mixed-media tests.",
      },
    ],
  },
};

export const CATEGORY_LANDING_LIST = Object.values(CATEGORY_LANDINGS);

export function categoryPath(category: VideoCategory) {
  return CATEGORY_LANDINGS[category].path;
}
