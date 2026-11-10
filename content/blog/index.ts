import type { ComponentType } from "react";
import AiProductLaunchVideoGuide from "./ai-product-launch-video-guide";
import HowToWriteAiVideoPrompts from "./how-to-write-ai-video-prompts-for-motion-design";
import WhatIsAiMotionDesign from "./what-is-ai-motion-design";

/**
 * Article bodies by slug. Add the post's metadata to BLOG_POSTS in
 * `lib/blog.ts` as well; a unit test checks the two lists match.
 */
export const BLOG_BODIES: Record<string, ComponentType> = {
  "ai-product-launch-video-guide": AiProductLaunchVideoGuide,
  "how-to-write-ai-video-prompts-for-motion-design": HowToWriteAiVideoPrompts,
  "what-is-ai-motion-design": WhatIsAiMotionDesign,
};
