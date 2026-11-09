export type PromptStatus = "original" | "reconstructed" | "unavailable";

export type VideoCategory =
  | "ai-motion-design"
  | "launch-videos"
  | "3d-experiments"
  | "ui-motion"
  | "kinetic-typography"
  | "cinematic-stories"
  | "creative-experiments";

export interface CreatorProfile {
  name: string;
  handle?: string;
  avatarUrl?: string;
  profileUrl?: string;
  xProfileUrl?: string;
  platform?: "x" | "instagram" | "youtube" | "vimeo" | "portfolio" | "other";
}

export interface VideoMetadata {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: VideoCategory;
  tags: string[];

  // Media assets. The poster and aspect ratio are optional: videos uploaded
  // before posters existed (or whose frame could not be captured) have
  // neither, and the card falls back to its shimmer and the video's own size.
  videoUrl: string;
  /** Still frame shown while the video loads. */
  posterUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: number;
  durationSeconds?: number;

  creator: CreatorProfile;
  sourceUrl?: string;

  promptStatus: PromptStatus;
  promptText?: string;
  negativePrompt?: string;
  toolsUsed?: string[];

  curatorNotes?: string;
  isFeatured?: boolean;
  publishedAt?: string;
}

export const CATEGORY_LABELS: Record<VideoCategory, string> = {
  "ai-motion-design": "AI Motion",
  "launch-videos": "Launch Videos",
  "3d-experiments": "3D & Experiments",
  "ui-motion": "UI Motion",
  "kinetic-typography": "Kinetic Typography",
  "cinematic-stories": "Cinematic & Visual Stories",
  "creative-experiments": "Creative Experiments",
};

export const CATEGORY_GRADIENTS: Record<VideoCategory, string> = {
  "ai-motion-design": "from-[#0b1220] via-[#1d4ed8] to-[#38bdf8]",
  "launch-videos": "from-[#1c1917] via-[#9a3412] to-[#f59e0b]",
  "3d-experiments": "from-[#111827] via-[#4c1d95] to-[#c4b5fd]",
  "ui-motion": "from-[#0b1120] via-[#0f766e] to-[#5eead4]",
  "kinetic-typography": "from-[#18181b] via-[#52525b] to-[#fafafa]",
  "cinematic-stories": "from-[#0c0a09] via-[#1f2937] to-[#94a3b8]",
  "creative-experiments": "from-[#1a0b2e] via-[#831843] to-[#fb7185]",
};

/** Stable 0–999 seed so each placeholder keeps the same light shapes on every render. */
export function visualSeed(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 1000;
  }
  return hash;
}

export function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function formatAspectRatio(ratio?: number) {
  if (!ratio) return "—";
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(ratio - 4 / 5) < 0.02) return "4:5";
  if (Math.abs(ratio - 1) < 0.02) return "1:1";
  if (Math.abs(ratio - 3 / 4) < 0.02) return "3:4";
  if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3";
  if (Math.abs(ratio - 5 / 6) < 0.02) return "5:6";
  if (Math.abs(ratio - 2.39) < 0.02) return "2.39:1";
  return `${Math.round(ratio * 100) / 100}:1`;
}

/**
 * The original post link, unless it merely repeats the creator's account link.
 * Cards and previews use this so an account is never presented as a source.
 */
export function originalVideoUrl(video: VideoMetadata) {
  const profileUrl = video.creator.xProfileUrl ?? video.creator.profileUrl;
  return video.sourceUrl?.replace(/\/+$/, "") !== profileUrl?.replace(/\/+$/, "")
    ? video.sourceUrl
    : undefined;
}

export function formatPublishedAt(date?: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export const CURATED_VIDEOS: VideoMetadata[] = [
  {
    id: "chromatic-drift",
    slug: "chromatic-drift",
    title: "Chromatic Drift",
    description:
      "A slow, iridescent camera pass through a liquid spectrum. Made as an opening title study for a music documentary.",
    category: "ai-motion-design",
    tags: ["runway-gen3", "camera-pan", "iridescent", "title-sequence"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 16 / 9,
    durationSeconds: 18,
    creator: {
      name: "Mira Voss",
      handle: "@miravoss",
      profileUrl: "https://x.com/miravoss",
      platform: "x",
    },
    sourceUrl: "https://x.com/miravoss",
    promptStatus: "original",
    promptText:
      "Slow cinematic dolly through an endless liquid prism, iridescent oil-on-water textures, soft volumetric light, deep blues and warm amber highlights, shallow depth of field, 35mm film grain, no text.",
    negativePrompt: "text, logos, people, harsh contrast, flicker",
    toolsUsed: ["Runway Gen-3 Alpha", "Topaz Video AI"],
    curatorNotes:
      "The restraint is what sells it — almost no cuts, and the colour never overpowers the subject.",
    isFeatured: true,
    publishedAt: "2026-10-21",
  },
  {
    id: "neon-requiem",
    slug: "neon-requiem",
    title: "Neon Requiem",
    description:
      "A rain-soaked city remembers itself. A short cinematic sequence built entirely from generated plates.",
    category: "cinematic-stories",
    tags: ["sora", "cyberpunk", "rain", "night", "cinematic"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 2.39,
    durationSeconds: 32,
    creator: {
      name: "Kenji Arata",
      handle: "@kenjiarata",
      profileUrl: "https://x.com/kenjiarata",
      platform: "x",
    },
    sourceUrl: "https://x.com/kenjiarata",
    promptStatus: "reconstructed",
    promptText:
      "Anamorphic night city in heavy rain, neon reflections on wet asphalt, a lone figure walking away from camera, slow push-in, teal and magenta palette, cinematic haze.",
    toolsUsed: ["Sora", "DaVinci Resolve"],
    curatorNotes:
      "The prompt is reconstructed from the creator's process thread — the exact seed was not shared.",
    isFeatured: true,
    publishedAt: "2026-10-14",
  },
  {
    id: "liquid-chrome-04",
    slug: "liquid-chrome-04",
    title: "Liquid Chrome 04",
    description:
      "A study in reflective surfaces and impossible geometry. Part of an ongoing material research series.",
    category: "3d-experiments",
    tags: ["midjourney", "comfyui", "chrome", "material-study"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 4 / 5,
    durationSeconds: 12,
    creator: {
      name: "Noa Bergström",
      handle: "@noaberg",
      profileUrl: "https://www.instagram.com/noaberg",
      platform: "instagram",
    },
    sourceUrl: "https://www.instagram.com/noaberg",
    promptStatus: "original",
    promptText:
      "Chrome liquid metal blob morphing into a human silhouette, studio lighting, seamless black background, macro lens, ultra sharp reflections, slow motion.",
    toolsUsed: ["Midjourney v7", "ComfyUI", "Kling 2.1"],
    publishedAt: "2026-10-09",
  },
  {
    id: "orbit-launch-film",
    slug: "orbit-launch-film",
    title: "Orbit — Launch Film",
    description:
      "A 20-second product reveal for a fictional satellite startup. Built as a spec piece for a launch-video studio.",
    category: "launch-videos",
    tags: ["kling", "product-launch", "space", "motion-blur"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 16 / 9,
    durationSeconds: 20,
    creator: {
      name: "Atlas Studio",
      handle: "@atlasstudio",
      profileUrl: "https://atlasstudio.example.com",
      platform: "portfolio",
    },
    sourceUrl: "https://atlasstudio.example.com",
    promptStatus: "original",
    promptText:
      "A matte black satellite drifting over a sunlit Earth limb, slow orbital camera move, lens flare, volumetric atmosphere, premium product film lighting, 35mm anamorphic.",
    toolsUsed: ["Kling 2.1", "After Effects", "Topaz Video AI"],
    curatorNotes:
      "A rare launch film that trusts silence — the edit holds every shot a beat longer than expected.",
    publishedAt: "2026-09-28",
  },
  {
    id: "gravity-type",
    slug: "gravity-type",
    title: "Gravity Type",
    description:
      "Kinetic typography that falls, stacks and settles. An experiment in letting physics write the composition.",
    category: "kinetic-typography",
    tags: ["kinetic-type", "physics", "runway", "monochrome"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 1,
    durationSeconds: 9,
    creator: {
      name: "Iris Chen",
      handle: "@irisbuilds",
      profileUrl: "https://x.com/irisbuilds",
      platform: "x",
    },
    sourceUrl: "https://x.com/irisbuilds",
    promptStatus: "unavailable",
    toolsUsed: ["Runway Gen-3 Alpha", "After Effects"],
    curatorNotes:
      "The creator shared the final render without a prompt — kept in the collection for the motion language alone.",
    publishedAt: "2026-09-19",
  },
  {
    id: "glass-os",
    slug: "glass-os",
    title: "Glass OS",
    description:
      "A speculative interface concept built around refracted glass layers and gentle spatial depth.",
    category: "ui-motion",
    tags: ["ui-concept", "glassmorphism", "veo", "spatial"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 4 / 3,
    durationSeconds: 14,
    creator: {
      name: "Ravi Menon",
      handle: "@raviui",
      profileUrl: "https://x.com/raviui",
      platform: "x",
    },
    sourceUrl: "https://x.com/raviui",
    promptStatus: "reconstructed",
    promptText:
      "Futuristic translucent UI panels floating in soft fog, frosted glass materials, subtle parallax, cool white and pale blue palette, smooth slow camera drift.",
    toolsUsed: ["Veo 3", "Figma", "Premiere Pro"],
    publishedAt: "2026-09-11",
  },
  {
    id: "signal-bloom",
    slug: "signal-bloom",
    title: "Signal Bloom",
    description:
      "An abstract broadcast test that mutates into a flower. Generative, noisy and oddly warm.",
    category: "creative-experiments",
    tags: ["signal", "glitch", "generative", "analog"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 5 / 6,
    durationSeconds: 16,
    creator: {
      name: "June Halvorsen",
      handle: "@junepixels",
      profileUrl: "https://www.behance.net/junepixels",
      platform: "other",
    },
    sourceUrl: "https://www.behance.net/junepixels",
    promptStatus: "original",
    promptText:
      "Analog TV signal interference blooming into a soft botanical form, scan lines, CRT bloom, warm coral and deep violet, slow zoom, dreamlike.",
    toolsUsed: ["ComfyUI", "Deforum", "DaVinci Resolve"],
    publishedAt: "2026-08-30",
  },
  {
    id: "monsoon-memory",
    slug: "monsoon-memory",
    title: "Monsoon Memory",
    description:
      "A quiet portrait of a street during monsoon season, reconstructed from a single reference photograph.",
    category: "cinematic-stories",
    tags: ["veo", "monsoon", "portrait", "film-look"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 3 / 4,
    durationSeconds: 24,
    creator: {
      name: "Aarav Pillai",
      handle: "@aaravframes",
      profileUrl: "https://www.instagram.com/aaravframes",
      platform: "instagram",
    },
    sourceUrl: "https://www.instagram.com/aaravframes",
    promptStatus: "original",
    promptText:
      "A narrow Indian street in heavy monsoon rain, warm shop lights reflecting in puddles, a cyclist passing in slow motion, handheld 16mm feel, muted greens and ochre.",
    toolsUsed: ["Veo 3", "Topaz Video AI"],
    curatorNotes:
      "The sound design is what makes this one stay with you — worth watching with audio.",
    publishedAt: "2026-08-22",
  },
  {
    id: "softbody-garden",
    slug: "softbody-garden",
    title: "Softbody Garden",
    description:
      "Simulated soft bodies growing into a garden of translucent forms. A gentle procedural study.",
    category: "3d-experiments",
    tags: ["simulation", "softbody", "blender", "pastel"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 1,
    durationSeconds: 11,
    creator: {
      name: "Léa Moreau",
      handle: "@leamoreau",
      profileUrl: "https://x.com/leamoreau",
      platform: "x",
    },
    sourceUrl: "https://x.com/leamoreau",
    promptStatus: "unavailable",
    toolsUsed: ["Blender", "ComfyUI"],
    publishedAt: "2026-08-08",
  },
  {
    id: "pulse-grid",
    slug: "pulse-grid",
    title: "Pulse Grid",
    description:
      "A rhythmic grid of light pulses that builds into a full-frame waveform. Built for a live visuals set.",
    category: "ai-motion-design",
    tags: ["audio-reactive", "grid", "light", "live-visuals"],
    videoUrl: "",
    thumbnailUrl: "",
    aspectRatio: 4 / 5,
    durationSeconds: 15,
    creator: {
      name: "Tomas Lind",
      handle: "@tomaslind",
      profileUrl: "https://x.com/tomaslind",
      platform: "x",
    },
    sourceUrl: "https://x.com/tomaslind",
    promptStatus: "original",
    promptText:
      "Endless grid of glowing nodes pulsing in sync with a low bassline, monochrome white on black, subtle lens bloom, precise mechanical rhythm, slow camera pull-back.",
    toolsUsed: ["Runway Gen-3 Alpha", "TouchDesigner"],
    publishedAt: "2026-07-30",
  },
];
