"use client";

import posthog from "posthog-js";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { promptWithVideoReference } from "@/lib/video-reference";

/** The preview panel's "Copy prompt" action, for the standalone video page. */
export function CopyPromptButton({
  videoId,
  promptText,
}: {
  videoId: string;
  promptText?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        promptWithVideoReference(promptText, videoId, window.location.origin),
      );
      posthog.capture("prompt_copied", { video_id: videoId });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the prompt stays selectable on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between rounded-full border border-white/20 bg-[#d6336c] px-4 py-2.5 text-[13px] font-medium text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(214,51,108,0.3)] outline-none transition-[background-color,transform] duration-150 hover:bg-[#bf2560] focus-visible:ring-2 focus-visible:ring-[#d6336c] focus-visible:ring-offset-2 motion-safe:active:scale-[0.99]"
    >
      {copied ? "Prompt copied" : "Copy prompt"}
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      )}
    </button>
  );
}
