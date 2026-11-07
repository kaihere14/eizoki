# AGENT.MD — Eizoki Technical & Editorial Playbook

This document serves as the persistent system prompt, architectural reference, and operational playbook for all AI agents and engineers contributing to **Eizoki**.

---

## 1. Project Mission & Identity

- **Project Name:** Eizoki
- **Role:** Hand-curated visual discovery platform for AI-generated motion design, experimental video, and creative launch films.
- **Core Stance:** **Curator, not generator.** We never build video generation tools or compete with generative models. Our entire focus is discovering, cataloging, attributing, and presenting the finest AI motion work on the web.
- **Quality Axiom:** **50 exceptional videos > 5,000 mediocre ones.** Refuse low-fidelity filler.

---

## 2. Guardrails & Non-Negotiables

1. **Editorial Sanctity:**
   - Every piece of media must feature clear creator attribution (`creatorName`, `creatorUrl`, `sourceUrl`).
   - Every prompt entry must have transparent provenance (`status: "original" | "reconstructed" | "unavailable"`).
2. **Performance First:**
   - Video previews must load instantly and remain muted by default.
   - Masonry layout must be stable with predefined aspect ratios to eliminate Cumulative Layout Shift (CLS).
   - Interaction budget: Animations must run at 60fps without dropping frames.
3. **Restrained, Premium Aesthetic:**
   - Dark visual atmosphere inspired by platforms like *Designerr.xyz*, *Vibrant Design*, and *Imagery*.
   - Visual noise must be minimized. UI elements support the video content, never overpower it.
   - Avoid generic, bloated dashboard templates or decorative interactions that slow down browsing.

---

## 3. Data Schema Specifications

All curated video items should conform to the following TypeScript interface definition:

```typescript
export type PromptStatus = 'original' | 'reconstructed' | 'unavailable';

export type VideoCategory =
  | 'ai-motion-design'
  | 'launch-videos'
  | '3d-experiments'
  | 'ui-motion'
  | 'kinetic-typography'
  | 'cinematic-stories'
  | 'creative-experiments';

export interface CreatorProfile {
  name: string;
  handle?: string;
  avatarUrl?: string;
  profileUrl: string; // Twitter/X, Instagram, Behance, YouTube, Website
  platform?: 'x' | 'instagram' | 'youtube' | 'vimeo' | 'portfolio' | 'other';
}

export interface VideoMetadata {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: VideoCategory;
  tags: string[]; // e.g. ["runway-gen3", "sora", "camera-pan", "dark-fantasy", "cyberpunk"]
  
  // Media Assets
  videoUrl: string;          // Direct video stream / MP4 / HLS / WebM
  previewUrl?: string;       // Lightweight looping preview (short WebM/MP4 or animated webp)
  thumbnailUrl: string;      // Fallback poster image
  aspectRatio: number;       // e.g. 16/9 (1.777), 9/16 (0.5625), 1/1, 2.39/1
  durationSeconds?: number;
  
  // Creator Info
  creator: CreatorProfile;
  sourceUrl: string;         // Direct link to the creator's original post/tweet
  
  // Prompt & Generation Details
  promptStatus: PromptStatus;
  promptText?: string;
  negativePrompt?: string;
  toolsUsed?: string[];      // e.g. ["Midjourney v6", "Runway Gen-3 Alpha", "ComfyUI", "Topaz AI"]
  
  // Editorial & Curation Flags
  curatorNotes?: string;
  isFeatured?: boolean;
  publishedAt: string;       // ISO 8601 string
}
```

---

## 4. Design & UI Directives

### Visual Palette & Atmosphere
- **Canvas / Background:** Deep zinc / obsidian blacks (`#08080A`, `#0D0E12`, `#14151B`).
- **Surfaces / Cards:** Subtle gradients with ultra-fine border highlights (`rgba(255, 255, 255, 0.06)` to `0.12`).
- **Typography:**
  - Modern sans-serif or grotesque for UI chrome (e.g., Inter, Geist, Plus Jakarta Sans).
  - Editorial serif or display font for headlines and curatorial statements when appropriate.
  - High contrast for readability, subdued metadata (`text-zinc-400`, `text-zinc-500`).
- **Accents:** Restrained monochrome with subtle iridescent or electric highlights for interactive states.

### Component Guidelines
- **Video Card:**
  - Aspect-ratio container that locks height and prevents layout jumps.
  - Silent video preview on hover with smooth fade-in.
  - Discrete creator badge and category pill.
  - Quick action to copy prompt (if available) or expand to full modal.
- **Filter & Search Bar:**
  - Sticky, unobtrusive category pills.
  - Fast search by title, creator, tool/model, or keyword.
- **Detail View (Modal / Page):**
  - High-res video player with loop, playback speed, and fullscreen options.
  - Full creator profile link and original source link.
  - Clear prompt disclosure box with one-click copy and prompt status label.
  - "Related motions" / "Similar workflows" section.

---

## 5. Development Roadmap & Implementation Phases

### Phase 1: Foundation & Scaffold
- [ ] Initialize repository stack (e.g. Next.js App Router / React, Tailwind CSS / Vanilla CSS, Lucide icons, Framer Motion).
- [ ] Implement design tokens and theme structure.
- [ ] Create static seed data structure (`data/curated-videos.ts`) with representative curated items across all categories.

### Phase 2: Masonry Discovery Engine
- [ ] Build robust, responsive masonry layout with zero layout shifts.
- [ ] Implement lightweight video preview card component with hover/interaction states.
- [ ] Add category filter navigation and model/tool tags.

### Phase 3: Detail Modal & Prompt Inspector
- [ ] Build full video inspection modal / route with creator attribution links.
- [ ] Implement prompt drawer with prompt status badges (`Original`, `Reconstructed`, `Unavailable`).
- [ ] One-click copy prompt with subtle toast feedback.

### Phase 4: Search, Filters & Curation Workflow
- [ ] Client-side or edge search indexing across titles, creators, tags, and tools.
- [ ] Curator submission / entry format (Markdown / JSON ingest).
- [ ] Collections & bookmarking system.

---

## 6. Rules of Engagement for Agents

When generating code or features for Eizoki:
1. **Never mock fake videos with broken video URLs without fallbacks:** Always provide reliable placeholder assets or embed support (e.g., MP4 links from dependable CDN sources or structured video embeds).
2. **Respect the Curation Philosophy:** Always write code assuming the platform is a curator, not an AI generator. Do not scaffold generation forms, model API integrations (like calling OpenAI or Runway API to generate clips), or credit billing systems.
3. **Maintain Consistency:** When editing components or adding features, ensure they adhere strictly to the dark, high-end editorial aesthetic.
4. **Link references cleanly:** Use absolute file paths when linking to files in responses.
