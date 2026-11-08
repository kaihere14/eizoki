"use client";

import Image from "next/image";
import { sponsorWebsiteOrigin } from "@/lib/sponsor-website";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Film,
  Globe,
  ImagePlus,
  Play,
  Plus,
  X,
} from "lucide-react";

const PLANS = [
  {
    id: "featured",
    name: "Featured video",
    description: "Put your film where the inspiration starts.",
    details:
      "A sponsored video placement in the Eizoki feed, alongside the motion our community comes to discover.",
    features: [
      "Video placement in the feed",
      "Creator credit and a destination link",
      "Clearly labelled as sponsored",
    ],
    icon: Film,
  },
  {
    id: "navbar",
    name: "Navbar sponsor",
    description: "A small mark with a constant presence.",
    details:
      "Your product’s icon in the navbar, with its name on hover and a direct link to your website.",
    features: [
      "Brand icon in the navbar",
      "Product name shown on hover",
      "Direct link to your website",
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

export function Sponsorship() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [faviconWebsite, setFaviconWebsite] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    website: "",
    email: "",
    description: "",
    video: "",
  });
  const bookingRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const plan = PLANS.find((item) => item.id === selected);

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

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewing(true);
  }

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 pb-24 sm:px-6">
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
                  onClick={() => {
                    setSelected(item.id);
                    setReviewing(false);
                  }}
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
              "Send your link, name and brand assets when booking.",
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
                  {reviewing
                    ? "Your booking preview"
                    : "Tell us about your product"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close booking details"
                onClick={() => {
                  setSelected(null);
                  setReviewing(false);
                }}
                className="rounded-full p-2 text-zinc-400 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[12.5px] text-zinc-500">
              Bookings open soon. You can preview your details here; nothing is
              submitted or charged.
            </p>
            {reviewing ? (
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
                      {draft.email}
                    </dd>
                  </div>
                  {selected === "featured" && (
                    <div>
                      <dt className="text-zinc-400">Video link</dt>
                      <dd className="mt-1 break-all text-zinc-700">
                        {draft.video}
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewing(false)}
                    className={raisedButton}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-full bg-zinc-200 px-5 py-2.5 text-[12.5px] font-medium text-zinc-500"
                  >
                    Bookings opening soon
                  </button>
                </div>
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
                      value={draft.email}
                      onChange={(event) =>
                        setDraft({ ...draft, email: event.target.value })
                      }
                      className={fieldClass}
                      placeholder="you@your-product.com"
                    />
                  </label>
                  {selected === "featured" && (
                    <label className="text-[12px] font-medium text-zinc-700">
                      Video link
                      <input
                        required
                        type="url"
                        pattern="https://.*"
                        value={draft.video}
                        onChange={(event) =>
                          setDraft({ ...draft, video: event.target.value })
                        }
                        className={fieldClass}
                        placeholder="https://…"
                      />
                    </label>
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
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 2_000_000
                    ) {
                      setIconError(
                        "Choose a PNG, JPG or WebP image smaller than 2 MB.",
                      );
                      return;
                    }
                    setIconError(null);
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
                    Preview booking
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

      <section
        className="mt-10 border-b border-zinc-200/70 pb-8"
        aria-labelledby="sponsor-supporters"
      >
        <h2
          id="sponsor-supporters"
          className="font-display text-[17px] font-semibold"
        >
          Previous sponsors
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
          A thank-you to the products that have supported the collection.
        </p>
        <a
          href="https://daemondoc.online?utm_source=eizoki.com&utm_medium=sponsorship&utm_campaign=eizoki_sponsorship"
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="mt-5 inline-flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Image
            src="/DaemonDoc.webp"
            alt=""
            width={36}
            height={36}
            className="rounded-lg object-contain"
          />
          <span>
            <span className="block text-[13px] font-medium text-zinc-800">
              DaemonDoc
            </span>
            <span className="mt-0.5 block text-[11px] text-zinc-400">
              Navbar sponsor
            </span>
          </span>
          <ArrowRight
            className="ml-4 h-3.5 w-3.5 text-zinc-400"
            aria-hidden="true"
          />
        </a>
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
            "Your product name, website, a short description and contact email. For a featured video, include a link to your film. You can also supply a square brand icon.",
          ],
          [
            "Are sponsored videos labelled?",
            "Yes. Paid video placements carry a Sponsored label. Editorial features remain separate from paid placements.",
          ],
          [
            "Can I book a placement today?",
            "Bookings are not open yet. Explore both placements and preview your product details; pricing and checkout will be available when booking opens.",
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
