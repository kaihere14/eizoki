"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLoginModal } from "@/components/login-modal";
import { useEizokiUser } from "@/components/user-provider";
import { sponsorWebsiteOrigin } from "@/lib/sponsor-website";
import {
  MAX_SPONSOR_ICON_BYTES,
  SPONSOR_ICON_TYPES,
  SPONSORSHIP_LABELS,
} from "@/lib/sponsorships";
import {
  cancelVideoUpload,
  errorMessage,
  uploadSurvives,
  uploadVideoToStorage,
  UploadRequestError,
  type FinishedUpload,
} from "@/lib/chunked-upload";
import {
  isVideoContentType,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_LABEL,
  VIDEO_CONTENT_TYPES,
} from "@/lib/video-upload-limits";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Film,
  Globe,
  ImagePlus,
  LoaderCircle,
  Play,
  Plus,
  X,
} from "lucide-react";

const VIDEO_TYPES = Object.keys(VIDEO_CONTENT_TYPES);

type SubmitState =
  | { status: "idle" }
  /** `progress` is the video upload's share done, or null once it is saving. */
  | { status: "submitting"; progress: number | null }
  | { status: "done"; live: boolean; endsAt: string | null }
  | { status: "error"; message: string };

const PLANS = [
  {
    id: "featured",
    placement: "FEED_VIDEO",
    name: "Featured video",
    description: "Put your film where the inspiration starts.",
    details:
      "A sponsored video placement in the Eizoki feed, alongside the motion our community comes to discover.",
    features: [
      "Pinned video placement in the feed",
      "Creator credit and a destination link",
      "One month, clearly labelled as sponsored",
    ],
    icon: Film,
  },
  {
    id: "navbar",
    placement: "NAVBAR",
    name: "Navbar sponsor",
    description: "A small mark with a constant presence.",
    details:
      "Your product’s icon in the navbar, with its name on hover and a direct link to your website.",
    features: [
      "Brand icon in the navbar",
      "Product name shown on hover",
      "Direct link to your website for one month",
    ],
    icon: Globe,
  },
] as const;
type Plan = (typeof PLANS)[number]["id"];

const fieldClass =
  "mt-2 block w-full rounded-[10px] border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-brand focus:ring-[3px] focus:ring-brand/10";
const raisedButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white bg-[linear-gradient(180deg,#fff_0%,#fafafa_52%,#f1f1f3_100%)] px-4 py-2.5 text-[12.5px] font-medium text-zinc-800 shadow-[inset_0_1px_0_#fff,inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_3px_rgba(9,9,11,0.08),0_5px_12px_-5px_rgba(9,9,11,0.18)] outline-none transition-[transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand motion-safe:active:scale-[0.97] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]";

function PlacementPreview({ plan }: { plan: Plan }) {
  if (plan === "navbar")
    return (
      <div
        className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/70 px-5"
        aria-label="Preview of a sponsored product icon in the navbar"
      >
        <div className="flex w-full max-w-[320px] items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-3 shadow-[0_8px_20px_-12px_rgba(9,9,11,0.2)]">
          <Image src="/eizoki.webp" alt="" width={20} height={20} />
          <span className="text-[12px] font-medium">eizoki</span>
          <span className="flex-1" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-brand/30 bg-brand-50 text-brand ring-4 ring-brand/5">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="absolute -bottom-8 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-600 shadow-sm">
              Your product
            </span>
          </div>
          <Plus className="h-3.5 w-3.5 text-zinc-300" aria-hidden="true" />
          <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] text-white">
            Submit
          </span>
        </div>
      </div>
    );
  return (
    <div
      className="flex h-44 items-center justify-center gap-2 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/70 px-5"
      aria-label="Preview of a sponsored video highlighted in the feed"
    >
      <div className="h-24 w-14 rounded-lg border border-zinc-200/70 bg-white" />
      <div className="flex h-32 w-44 flex-col rounded-xl border border-brand/25 bg-white p-2 shadow-[0_8px_20px_-12px_rgba(9,9,11,0.2)] ring-4 ring-brand/5">
        <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-100">
          <Play
            className="h-5 w-5 text-zinc-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-zinc-600">
            Your video
          </span>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] text-brand">
            Sponsored
          </span>
        </div>
      </div>
      <div className="h-28 w-14 rounded-lg border border-zinc-200/70 bg-white" />
    </div>
  );
}

const endDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * `/sponsor?plan=navbar` (the admin "+" in the navbar) opens a booking form
 * directly. The parameter is consumed so closing and reopening still works.
 */
function PlanFromUrl({ onPlan }: { onPlan: (plan: Plan) => void }) {
  const plan = useSearchParams().get("plan");
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const match = PLANS.find((item) => item.id === plan);
    if (!match) return;
    onPlan(match.id);
    router.replace(pathname, { scroll: false });
  }, [plan, onPlan, router, pathname]);
  return null;
}

export function Sponsorship() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const { isSignedIn, user } = useUser();
  const isAdmin = useEizokiUser().user?.isAdmin === true;
  const router = useRouter();
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const { openLoginModal } = useLoginModal();
  const [iconError, setIconError] = useState<string | null>(null);
  const [faviconWebsite, setFaviconWebsite] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    website: "",
    description: "",
  });
  const bookingRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  // A video already in R2 whose booking was rejected; a retry reuses it.
  const uploadedRef = useRef<{ file: File; upload: FinishedUpload } | null>(
    null,
  );
  const plan = PLANS.find((item) => item.id === selected);

  useEffect(
    () => () => {
      if (uploadedRef.current) cancelVideoUpload(uploadedRef.current.upload);
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => setFaviconWebsite(sponsorWebsiteOrigin(draft.website)),
      350,
    );
    return () => clearTimeout(timer);
  }, [draft.website]);

  useEffect(
    () => () => {
      if (iconUrl) URL.revokeObjectURL(iconUrl);
    },
    [iconUrl],
  );

  useEffect(() => {
    if (!selected) return;
    bookingRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    nameRef.current?.focus({ preventScroll: true });
  }, [selected]);

  // Default to the account email until the sponsor types their own.
  const contactEmail =
    emailDraft ?? user?.primaryEmailAddress?.emailAddress ?? "";

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === "featured" && !videoFile) {
      setVideoError("Choose the video you want featured.");
      return;
    }
    setSubmit({ status: "idle" });
    setReviewing(true);
  }

  async function book() {
    if (!plan || submit.status === "submitting") return;
    if (!isSignedIn) {
      openLoginModal();
      return;
    }
    const body = new FormData();
    body.set("placement", plan.placement);
    body.set("productName", draft.name);
    body.set("websiteUrl", draft.website);
    body.set("contactEmail", contactEmail);
    body.set("description", draft.description);
    if (iconFile) body.set("icon", iconFile);

    const needsVideo = plan.placement === "FEED_VIDEO" && videoFile;
    setSubmit({ status: "submitting", progress: needsVideo ? 0 : null });
    try {
      if (needsVideo) {
        // The video goes straight to storage; the booking only names it.
        let upload =
          uploadedRef.current?.file === videoFile
            ? uploadedRef.current.upload
            : null;
        if (!upload) {
          upload = await uploadVideoToStorage(videoFile, "sponsor", {
            onProgress: (progress) =>
              setSubmit({ status: "submitting", progress }),
          });
          uploadedRef.current = { file: videoFile, upload };
        }
        body.set("videoUpload", JSON.stringify(upload));
        setSubmit({ status: "submitting", progress: null });
      }
      const response = await fetch("/api/sponsorships", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const failure = new UploadRequestError(
          await errorMessage(
            response,
            "The booking could not be sent. Please try again.",
          ),
          response.status,
        );
        if (!uploadSurvives(failure)) uploadedRef.current = null;
        throw failure;
      }
      uploadedRef.current = null;
      const result: unknown = await response.json().catch(() => null);
      const sponsorship =
        typeof result === "object" && result !== null && "sponsorship" in result
          ? (result.sponsorship as { status?: string; endsAt?: string | null })
          : null;
      const live = sponsorship?.status === "APPROVED";
      setSubmit({ status: "done", live, endsAt: sponsorship?.endsAt ?? null });
      if (live) {
        // Show the new sponsor in the navbar and feed without a reload.
        router.refresh();
        window.dispatchEvent(new Event("eizoki:videos-changed"));
      }
    } catch (cause) {
      setSubmit({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "The booking could not be sent. Please try again.",
      });
    }
  }

  // Stable so the URL reader's effect only reruns when `?plan=` changes.
  const choosePlan = useCallback((id: Plan) => {
    setSelected(id);
    setReviewing(false);
    setSubmit({ status: "idle" });
    setVideoError(null);
  }, []);

  function closeBooking() {
    setSelected(null);
    setReviewing(false);
    setSubmit({ status: "idle" });
  }

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 sm:px-6">
      <Suspense fallback={null}>
        <PlanFromUrl onPlan={choosePlan} />
      </Suspense>
      <section aria-labelledby="sponsor-plans" className="pt-3 sm:pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h2
            id="sponsor-plans"
            className="font-display text-[18px] font-semibold tracking-tight"
          >
            Two ways to be seen
          </h2>
          <span className="text-[12px] text-zinc-400">
            Every placement is reviewed by hand.
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {PLANS.map((item) => (
            <article
              key={item.id}
              className={`flex min-w-0 flex-col rounded-[20px] border bg-white p-5 sm:p-6 ${selected === item.id ? "border-brand/40 ring-2 ring-brand/5" : "border-zinc-200/80"}`}
            >
              <PlacementPreview plan={item.id} />
              <div className="mt-6 flex items-center gap-2.5">
                <item.icon
                  className="h-4 w-4 text-zinc-400"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <h3 className="font-display text-[21px] font-semibold tracking-tight">
                  {item.name}
                </h3>
              </div>
              <p className="mt-2 text-[13px] font-medium text-zinc-700">
                {item.description}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
                {item.details}
              </p>
              <ul className="my-6 space-y-3">
                {item.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-[12px] text-zinc-600"
                  >
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-brand"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto border-t border-zinc-100 pt-5">
                <p className="mb-3 text-[12px] text-zinc-400">
                  Pricing announced soon
                </p>
                <button
                  type="button"
                  aria-expanded={selected === item.id}
                  aria-controls="sponsor-booking"
                  onClick={() => choosePlan(item.id)}
                  className={`${raisedButton} w-full`}
                >
                  Explore {item.name.toLowerCase()}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-10 border-y border-zinc-200/70 py-6"
        aria-labelledby="sponsor-process"
      >
        <h2
          id="sponsor-process"
          className="font-display text-[16px] font-semibold"
        >
          A considered place for your work
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            [
              "Choose your placement",
              "Pick the spot that suits your product or film.",
            ],
            [
              "Share your details",
              "Send your link, name and brand assets. Each booking runs for one month.",
            ],
            [
              "We review and publish",
              "We confirm your assets and timing before anything goes live.",
            ],
          ].map(([title, text], index) => (
            <li key={title}>
              <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-[10px] text-zinc-400">
                {index + 1}
              </span>
              <h3 className="text-[12.5px] font-medium text-zinc-800">
                {title}
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="sponsor-booking"
        ref={bookingRef}
        hidden={!plan}
        aria-labelledby="booking-title"
        className="mt-10 scroll-mt-20 rounded-[20px] border border-zinc-200/80 bg-zinc-50/40 p-5 sm:p-7"
      >
        {plan && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[12px] text-brand">{plan.name}</p>
                <h2
                  id="booking-title"
                  className="font-display text-[22px] font-semibold tracking-tight"
                >
                  {submit.status === "done"
                    ? submit.live
                      ? "Sponsor is live"
                      : "Booking received"
                    : reviewing
                      ? "Review your booking"
                      : "Tell us about your product"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close booking details"
                onClick={closeBooking}
                className="rounded-full p-2 text-zinc-400 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[12.5px] text-zinc-500">
              {submit.status === "done"
                ? submit.live
                  ? `It is showing as a ${SPONSORSHIP_LABELS[plan.placement].toLowerCase()} now${submit.endsAt ? ` and runs until ${endDate.format(new Date(submit.endsAt))}` : ""}. Manage it under Admin → Sponsorships.`
                  : "Thank you. We review every booking by hand and will email you to confirm timing and payment before anything goes live."
                : isAdmin
                  ? "Admin booking: it skips review and payment, and goes live immediately for one month."
                  : "One month placement. Nothing is charged yet: we review your booking and email you to confirm the start date and payment."}
            </p>
            {submit.status === "done" ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={closeBooking}
                  className={raisedButton}
                >
                  Done
                </button>
              </div>
            ) : reviewing ? (
              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <BrandIcon url={iconUrl} website={faviconWebsite} />
                  <div>
                    <h3 className="text-[15px] font-medium">{draft.name}</h3>
                    <p className="break-all text-[12px] text-zinc-500">
                      {draft.website}
                    </p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-600">
                  {draft.description}
                </p>
                <dl className="mt-5 grid gap-3 text-[12px] sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-400">Contact email</dt>
                    <dd className="mt-1 break-all text-zinc-700">
                      {contactEmail}
                    </dd>
                  </div>
                  {selected === "featured" && videoFile && (
                    <div>
                      <dt className="text-zinc-400">Video</dt>
                      <dd className="mt-1 break-all text-zinc-700">
                        {videoFile.name}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-zinc-400">Duration</dt>
                    <dd className="mt-1 text-zinc-700">One month</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewing(false)}
                    disabled={submit.status === "submitting"}
                    className={raisedButton}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={book}
                    disabled={submit.status === "submitting"}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[12.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_var(--brand-shadow)] outline-none transition-[background-color,transform] duration-150 hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
                  >
                    {submit.status === "submitting" && (
                      <LoaderCircle
                        className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    {submit.status === "submitting"
                      ? submit.progress !== null
                        ? `Uploading video ${Math.round(submit.progress * 100)}%`
                        : isAdmin
                          ? "Publishing…"
                          : "Sending booking…"
                      : !isSignedIn
                        ? "Sign in to book"
                        : isAdmin
                          ? "Publish now"
                          : "Send booking"}
                  </button>
                </div>
                {submit.status === "error" && (
                  <p role="alert" className="mt-3 text-[12px] text-red-600">
                    {submit.message}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={review} className="mt-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-[12px] font-medium text-zinc-700">
                    Product name
                    <input
                      ref={nameRef}
                      required
                      maxLength={120}
                      autoComplete="organization"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                      className={fieldClass}
                      placeholder="Your product or studio"
                    />
                  </label>
                  <label className="text-[12px] font-medium text-zinc-700">
                    Website link
                    <input
                      required
                      type="url"
                      pattern="https://.*"
                      value={draft.website}
                      onBlur={() => {
                        if (
                          !draft.website.trim().includes("://") &&
                          sponsorWebsiteOrigin(draft.website)
                        ) {
                          setDraft({
                            ...draft,
                            website: `https://${draft.website.trim()}`,
                          });
                        }
                      }}
                      onChange={(event) =>
                        setDraft({ ...draft, website: event.target.value })
                      }
                      className={fieldClass}
                      placeholder="https://your-product.com"
                    />
                  </label>
                  <label className="text-[12px] font-medium text-zinc-700">
                    Contact email
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(event) => setEmailDraft(event.target.value)}
                      className={fieldClass}
                      placeholder="you@your-product.com"
                    />
                  </label>
                  {selected === "featured" && (
                    <div className="text-[12px] font-medium text-zinc-700">
                      Video
                      <button
                        type="button"
                        onClick={() => videoRef.current?.click()}
                        aria-describedby="sponsor-video-help"
                        className={`${fieldClass} flex items-center gap-2 text-left`}
                      >
                        <Film
                          className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                          aria-hidden="true"
                        />
                        <span
                          className={`truncate ${videoFile ? "text-zinc-900" : "text-zinc-400"}`}
                        >
                          {videoFile ? videoFile.name : "Choose a video file"}
                        </span>
                      </button>
                      <span
                        id="sponsor-video-help"
                        className="mt-1 block text-[11px] font-normal text-zinc-400"
                      >
                        MP4, MOV or WebM, up to {MAX_VIDEO_LABEL}
                      </span>
                      <input
                        ref={videoRef}
                        type="file"
                        accept={VIDEO_TYPES.join(",")}
                        aria-label="Choose sponsored video"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          if (
                            !isVideoContentType(file.type) ||
                            file.size > MAX_VIDEO_BYTES
                          ) {
                            setVideoError(
                              `Choose an MP4, MOV or WebM video up to ${MAX_VIDEO_LABEL}.`,
                            );
                            return;
                          }
                          if (uploadedRef.current) {
                            cancelVideoUpload(uploadedRef.current.upload);
                            uploadedRef.current = null;
                          }
                          setVideoError(null);
                          setVideoFile(file);
                        }}
                      />
                      {videoError && (
                        <span
                          role="alert"
                          className="mt-1 block text-[12px] font-normal text-red-600"
                        >
                          {videoError}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <label className="mt-5 block text-[12px] font-medium text-zinc-700">
                  Short description
                  <textarea
                    required
                    maxLength={500}
                    rows={3}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    className={`${fieldClass} resize-y`}
                    placeholder="What are you making, and who is it for?"
                  />
                </label>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <BrandIcon url={iconUrl} website={faviconWebsite} />
                  <div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded text-[12px] font-medium text-zinc-700 outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                      {iconUrl ? "Change custom icon" : "Upload custom icon"}
                    </button>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {iconUrl
                        ? "Custom icon · PNG, JPG or WebP, up to 2 MB"
                        : "Website favicon by default · custom image up to 2 MB"}
                    </p>
                  </div>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIconUrl(null);
                        setIconFile(null);
                        setIconError(null);
                      }}
                      className="rounded p-1 text-[11px] text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Use website icon
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Choose brand icon"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (
                      !Object.hasOwn(SPONSOR_ICON_TYPES, file.type) ||
                      file.size > MAX_SPONSOR_ICON_BYTES
                    ) {
                      setIconError(
                        "Choose a PNG, JPG or WebP image smaller than 2 MB.",
                      );
                      return;
                    }
                    setIconError(null);
                    setIconFile(file);
                    setIconUrl(URL.createObjectURL(file));
                  }}
                />
                {iconError && (
                  <p role="alert" className="mt-2 text-[12px] text-red-600">
                    {iconError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button type="submit" className={raisedButton}>
                    Review booking
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    All placements need approval before publication.
                  </span>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="sponsor-questions">
        <h2
          id="sponsor-questions"
          className="mb-4 font-display text-[17px] font-semibold"
        >
          A few things to know
        </h2>
        {[
          [
            "Will my sponsorship go live automatically?",
            "Every booking is reviewed. We confirm your product details, assets and placement timing, then publish it ourselves.",
          ],
          [
            "What should I prepare?",
            "Your product name, website, a short description and contact email. For a featured video, upload your film (MP4, MOV or WebM, up to 500 MB). You can also supply a square brand icon.",
          ],
          [
            "Are sponsored videos labelled?",
            "Yes. Paid video placements carry a Sponsored label. Editorial features remain separate from paid placements.",
          ],
          [
            "How long does a placement run?",
            "Every booking runs for one calendar month. The navbar holds up to three sponsors and the feed one featured video at a time, so we confirm your start date when we review the booking.",
          ],
          [
            "When do I pay?",
            "Nothing is charged when you book. We review your booking first, then email you to confirm the start date and payment.",
          ],
        ].map(([question, answer]) => (
          <details
            key={question}
            className="group border-b border-zinc-100 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-[13px] font-medium text-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-zinc-500">
              {answer}
            </p>
          </details>
        ))}
      </section>
    </main>
  );
}

function BrandIcon({
  url,
  website,
}: {
  url: string | null;
  website: string | null;
}) {
  return (
    <BrandIconImage
      key={`${url ?? ""}:${website ?? ""}`}
      url={url}
      website={website}
    />
  );
}

function BrandIconImage({
  url,
  website,
}: {
  url: string | null;
  website: string | null;
}) {
  const [attempt, setAttempt] = useState(0);
  const candidates = url
    ? [url]
    : website
      ? [
          `${website}/favicon.ico`,
          `${website}/icon.png`,
          `${website}/apple-touch-icon.png`,
        ]
      : [];
  const source = candidates[attempt];
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-400">
      {source ? (
        // Remote favicons and local blob previews are loaded directly, without optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={source}
          src={source}
          referrerPolicy="no-referrer"
          onError={() =>
            setAttempt((value) => (value === attempt ? value + 1 : value))
          }
          alt={url ? "Your custom brand icon" : "Website favicon"}
          width={44}
          height={44}
          className="h-full w-full object-contain"
        />
      ) : (
        <Globe className="h-4 w-4" aria-hidden="true" />
      )}
    </div>
  );
}
