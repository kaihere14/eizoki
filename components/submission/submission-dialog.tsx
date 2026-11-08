"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEizokiUser } from "@/components/user-provider";
import { CATEGORY_LABELS } from "@/lib/videos";
import { useVideoSubmission } from "./use-video-submission";
import { VideoUpload } from "./video-upload";
import { TagPicker } from "./tag-picker";

const inputClass =
  "mt-2 w-full rounded-[10px] border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 shadow-[0_1px_2px_rgba(9,9,11,0.02)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-brand focus:ring-[3px] focus:ring-brand/10 disabled:opacity-60";
const labelClass = "block text-[12px] font-medium text-zinc-700";

export function SubmissionDialog({ onClose }: { onClose: () => void }) {
  const { user } = useEizokiUser();
  const isAdmin = user?.isAdmin === true;
  const submission = useVideoSubmission(isAdmin);
  const [hasPrompt, setHasPrompt] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    dialog.showModal();
    if (window.matchMedia("(min-width: 1024px)").matches) {
      dialog
        .querySelector<HTMLInputElement>("#submission-title")
        ?.focus({ preventScroll: true });
    } else {
      dialog.focus({ preventScroll: true });
    }
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0)
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const published = submission.receipt?.reviewStatus === "APPROVED";

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!submission.isSubmitting) onClose();
      }}
      className="submission-dialog fixed inset-x-0 top-[53px] bottom-0 m-0 h-[calc(100dvh-53px)] max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-white/80 p-0 text-zinc-900 backdrop-blur-[6px] outline-none backdrop:bg-transparent lg:overflow-hidden"
    >
      <div
        className="submission-dialog-content mx-auto flex min-h-full w-full max-w-[1100px] flex-col px-4 py-6 sm:px-8 sm:py-8 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-10"
        onClick={(event) => {
          if (event.target === event.currentTarget && !submission.isSubmitting)
            onClose();
        }}
      >
        <header className="mb-7 flex shrink-0 items-start justify-between gap-4 sm:mb-9">
          <div>
            <h2
              id={titleId}
              className="font-display text-[25px] font-semibold leading-tight tracking-tight sm:text-[28px]"
            >
              {submission.receipt
                ? published
                  ? "Your video is published"
                  : "Thanks for sharing"
                : "Submit a video"}
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-[13px] leading-relaxed text-zinc-500"
            >
              {submission.receipt
                ? "One more piece of motion worth watching."
                : "Share the video. Credit the creator. Pass on the prompt."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submission.isSubmitting}
            aria-label="Close submission"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 shadow-sm outline-none transition-[color,transform] duration-150 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-brand active:scale-95 disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </header>

        {submission.receipt ? (
          <div
            role="status"
            className="mx-auto my-auto flex w-full max-w-[420px] flex-col items-center py-16 text-center"
          >
            <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand">
              <Check className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <h3 className="font-display text-[24px] font-semibold tracking-tight">
              {submission.receipt.title}
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">
              {published
                ? "Published and ready for the collection."
                : "Your video is in the review queue. Once approved, it will appear in the collection with the creator’s credit."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[13px] font-medium text-zinc-700 shadow-sm outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to browsing
            </button>
          </div>
        ) : (
          <form
            onSubmit={submission.submit}
            className="grid items-start gap-7 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-12"
          >
            <VideoUpload
              selection={submission.selection}
              inputRef={submission.fileInputRef}
              error={submission.fileError}
              disabled={submission.isSubmitting}
              onChoose={submission.chooseFile}
            />
            <div className="min-w-0 rounded-[20px] border border-zinc-200/70 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(9,9,11,0.08)] sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              <fieldset
                disabled={submission.isSubmitting}
                className="space-y-5"
              >
                <label className={labelClass} htmlFor="submission-title">
                  Video title
                  <input
                    id="submission-title"
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Give this piece a name"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass} htmlFor="submission-category">
                  <span id="submission-category-label">Category</span>
                  <select
                    aria-labelledby="submission-category-label"
                    id="submission-category"
                    name="category"
                    required
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="border-t border-zinc-100 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass} htmlFor="submission-creator">
                      Creator name
                      <input
                        id="submission-creator"
                        name="creatorName"
                        required
                        maxLength={200}
                        placeholder="Who made the video?"
                        defaultValue={
                          [user?.firstName, user?.lastName]
                            .filter(Boolean)
                            .join(" ") ||
                          user?.username ||
                          ""
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass} htmlFor="submission-x">
                      X profile{" "}
                      <span className="font-normal text-zinc-400">
                        (optional)
                      </span>
                      <input
                        id="submission-x"
                        name="creatorX"
                        maxLength={2048}
                        placeholder="@username or profile link"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">
                    Sharing someone else’s work? Use their name and profile.
                  </p>
                </div>
                <TagPicker />
                <div className="border-t border-zinc-100 pt-5">
                  <label className={labelClass} htmlFor="submission-prompt">
                    Prompt{" "}
                    <span className="font-normal text-zinc-400">
                      (optional)
                    </span>
                    <textarea
                      id="submission-prompt"
                      name="promptText"
                      maxLength={30000}
                      rows={4}
                      placeholder="The prompt behind the video…"
                      onChange={(event) =>
                        setHasPrompt(Boolean(event.target.value.trim()))
                      }
                      className={`${inputClass} min-h-28 resize-y leading-relaxed`}
                    />
                  </label>
                  {hasPrompt && (
                    <label
                      className="mt-3 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500"
                      htmlFor="submission-prompt-status"
                    >
                      How was this prompt sourced?
                      <select
                        id="submission-prompt-status"
                        name="promptStatus"
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] text-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <option value="ORIGINAL">Original prompt</option>
                        <option value="RECONSTRUCTED">
                          Reconstructed prompt
                        </option>
                      </select>
                    </label>
                  )}
                </div>
                <details className="group border-t border-zinc-100 pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded text-[12px] font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                    More details{" "}
                    <span className="flex items-center gap-2 text-[11px] font-normal text-zinc-400">
                      Optional
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="space-y-4 pt-4">
                    <label className={labelClass} htmlFor="submission-source">
                      Original post or source
                      <input
                        id="submission-source"
                        name="sourceUrl"
                        type="url"
                        pattern="https://.*"
                        maxLength={2048}
                        placeholder="https://…"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass} htmlFor="submission-tools">
                      Tools used
                      <input
                        id="submission-tools"
                        name="toolsUsed"
                        maxLength={2400}
                        placeholder="Runway, After Effects…"
                        className={inputClass}
                      />
                      <span className="mt-1.5 block text-[11px] font-normal text-zinc-400">
                        Separate tools with commas.
                      </span>
                    </label>
                    {hasPrompt && (
                      <label
                        className={labelClass}
                        htmlFor="submission-negative"
                      >
                        Negative prompt
                        <textarea
                          id="submission-negative"
                          name="negativePrompt"
                          maxLength={10000}
                          rows={2}
                          placeholder="What the model should avoid"
                          className={`${inputClass} resize-y`}
                        />
                      </label>
                    )}
                    {isAdmin && (
                      <div className="space-y-4 border-t border-zinc-100 pt-4">
                        <label className="flex items-center gap-2 text-[12px] text-zinc-700">
                          <input
                            name="isFeatured"
                            type="checkbox"
                            className="h-4 w-4 accent-brand"
                          />{" "}
                          Feature this video
                        </label>
                        <label
                          className={labelClass}
                          htmlFor="submission-notes"
                        >
                          Curator notes
                          <textarea
                            id="submission-notes"
                            name="curatorNotes"
                            maxLength={5000}
                            rows={2}
                            className={`${inputClass} resize-y`}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </details>
              </fieldset>
              {submission.error && (
                <p
                  role="alert"
                  className="mt-5 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[12px] leading-relaxed text-red-700"
                >
                  {submission.error}
                </p>
              )}
              <div className="mt-6 border-t border-zinc-100 pt-5">
                <button
                  type="submit"
                  disabled={submission.isSubmitting}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 bg-brand px-5 py-3 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_var(--brand-shadow)] outline-none transition-[background-color,transform] duration-150 hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                >
                  {submission.isSubmitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{" "}
                      Uploading your video…
                    </>
                  ) : (
                    <>
                      {isAdmin ? "Publish video" : "Submit for review"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
                <p
                  role="status"
                  className="mt-3 text-center text-[11.5px] leading-relaxed text-zinc-500"
                >
                  {submission.isSubmitting
                    ? "Keep this window open while your video is submitted."
                    : isAdmin
                      ? "Your video will be published immediately."
                      : "Every submission is reviewed before it joins the collection."}
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
