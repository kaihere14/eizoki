"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLoginModal } from "@/components/login-modal";
import { AccountControl } from "@/components/auth/account-control";
import { useUser } from "@clerk/nextjs";
import { SubmissionDialog } from "@/components/submission/submission-dialog";
import {
  SearchDialog,
  type SearchOrigin,
  type SearchOriginRect,
} from "@/components/search-dialog";
import { useEizokiUser } from "@/components/user-provider";
import { RestrictionNotice } from "@/components/restriction-notice";
import type { RestrictionCode } from "@/lib/account-limits";

interface NavbarProps {
  /** Server-rendered sponsor icons; see components/navbar-sponsors.tsx. */
  sponsorSlot?: React.ReactNode;
  onSearchClick?: () => void;
  onSubmitClick?: () => void;
  onLoginClick?: () => void;
}

export function HoverHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative hidden items-center sm:flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            key="hover-hint"
            role="tooltip"
            initial={{ opacity: 0, y: -4, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -3, scale: 0.96, x: "-50%" }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 32,
              mass: 0.6,
            }}
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 whitespace-nowrap rounded-[6px] border border-zinc-200/90 bg-[linear-gradient(180deg,var(--raised-top)_0%,var(--raised-mid)_100%)] px-2 py-[3px] text-[10.5px] font-medium leading-normal tracking-tight text-zinc-800 shadow-[inset_0_2px_3px_rgba(9,9,11,0.10),inset_0_1px_0_rgba(9,9,11,0.04),inset_0_-1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(9,9,11,0.06),0_4px_14px_rgba(9,9,11,0.10)]"
          >
            {label}
            <span
              aria-hidden="true"
              className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 rounded-[1px] border-l border-t border-zinc-200/90 bg-(--raised-top)"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({
  sponsorSlot,
  onSearchClick,
  onSubmitClick,
  onLoginClick,
}: NavbarProps) {
  const { openLoginModal } = useLoginModal();
  // Visibility only: /admin and every admin action re-check Postgres.
  const { user: account } = useEizokiUser();
  const isAdmin = account?.isAdmin === true;

  const handleLoginClick = onLoginClick ?? openLoginModal;
  const { isSignedIn, user: clerkUser } = useUser();
  // The navbar stays usable while the submission form is open, so the form
  // belongs to the page it was opened on: navigating elsewhere closes it.
  const pathname = usePathname();
  const [submissionPath, setSubmissionPath] = useState<string | null>(null);
  const submissionOpen = submissionPath !== null && submissionPath === pathname;
  const setSubmissionOpen = (open: boolean) =>
    setSubmissionPath(open ? pathname : null);
  const [restriction, setRestriction] = useState<RestrictionCode | null>(null);
  // Search grows out of the control that opened it and shrinks back into it.
  // `open` turns false on close, but the state stays until the panel has
  // landed, so the trigger stays hidden under it until then.
  const [search, setSearch] = useState<{
    origin: SearchOrigin;
    open: boolean;
    rect: SearchOriginRect | null;
  } | null>(null);
  const searchPillRef = useRef<HTMLButtonElement>(null);
  const searchIconRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRect = (origin: SearchOrigin) => {
    const element =
      origin === "pill" ? searchPillRef.current : searchIconRef.current;
    const rect = element?.getBoundingClientRect();
    // A trigger hidden at this width has no box; the panel then just fades.
    if (!rect || rect.width === 0) return null;
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  };
  const openSearch = (origin: SearchOrigin) => {
    if (onSearchClick) return onSearchClick();
    setSearch({ origin, open: true, rect: searchTriggerRect(origin) });
  };
  const closeSearch = () =>
    setSearch((current) =>
      current && {
        ...current,
        open: false,
        // Measure again: the window may have changed size while open.
        rect: searchTriggerRect(current.origin),
      },
    );

  const openSearchRef = useRef(openSearch);
  useEffect(() => {
    openSearchRef.current = openSearch;
  });

  // ⌘K / Ctrl+K anywhere, or "/" when not typing, opens search.
  useEffect(() => {
    if (onSearchClick) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      const shortcut =
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey);
      // Leave other open dialogs (submission, preview) in charge of the keys.
      if (!shortcut || document.querySelector("dialog[open], [aria-modal]"))
        return;
      event.preventDefault();
      // Grow from whichever trigger this screen width shows.
      openSearchRef.current(
        window.matchMedia("(min-width: 768px)").matches ? "pill" : "icon",
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSearchClick]);
  const handleSubmitClick =
    onSubmitClick ??
    (() => {
      if (!isSignedIn) return openLoginModal();
      // Explain the limit up front; the server enforces it either way.
      if (account?.uploadBanned) return setRestriction("UPLOAD_BANNED");
      if (account?.hasPendingVideo) return setRestriction("REVIEW_PENDING");
      setSubmissionOpen(true);
    });

  const [hoveredBrandItem, setHoveredBrandItem] = useState<
    "logo" | "text" | null
  >(null);
  const [boxRect, setBoxRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [tilt, setTilt] = useState(0);

  const [hoveredNavItem, setHoveredNavItem] = useState<
    "my-videos" | "favourites" | null
  >(null);
  const [navPillRect, setNavPillRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const brandContainerRef = useRef<HTMLAnchorElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const prevXRef = useRef<number | null>(null);

  const navClusterRef = useRef<HTMLElement>(null);
  const myVideosRef = useRef<HTMLAnchorElement>(null);
  const favouritesRef = useRef<HTMLAnchorElement>(null);

  const updateRect = (target: "logo" | "text") => {
    const container = brandContainerRef.current;
    const el = target === "logo" ? logoRef.current : textRef.current;
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const paddingX = target === "logo" ? 4 : 6;
    const paddingY = 4;

    const nextX = elRect.left - containerRect.left - paddingX;

    // Playful little lean in the direction of travel when sliding between targets
    if (prevXRef.current !== null) {
      const dx = nextX - prevXRef.current;
      setTilt(Math.max(-2.5, Math.min(2.5, dx * 0.08)));
    }
    prevXRef.current = nextX;

    setBoxRect({
      x: nextX,
      y: elRect.top - containerRect.top - paddingY,
      width: elRect.width + paddingX * 2,
      height: elRect.height + paddingY * 2,
    });
  };

  // Let the tilt settle back to level once the slide has traveled
  useEffect(() => {
    if (tilt === 0) return;
    const timeout = setTimeout(() => setTilt(0), 240);
    return () => clearTimeout(timeout);
  }, [tilt]);

  const handleMouseEnter = (target: "logo" | "text") => {
    updateRect(target);
    setHoveredBrandItem(target);
  };

  const handleMouseLeave = () => {
    setHoveredBrandItem(null);
  };

  const handleNavEnter = (target: "my-videos" | "favourites") => {
    const container = navClusterRef.current;
    const el =
      target === "my-videos" ? myVideosRef.current : favouritesRef.current;
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setNavPillRect({
      x: elRect.left - containerRect.left,
      y: elRect.top - containerRect.top,
      width: elRect.width,
      height: elRect.height,
    });
    setHoveredNavItem(target);
  };

  const handleNavLeave = () => {
    setHoveredNavItem(null);
  };

  return (
    <>
      <header
        onClickCapture={(event) => {
          // A navbar link (logo, My Videos, ...) leaves the form, even when it
          // points at the current page.
          if ((event.target as Element).closest("a[href]"))
            setSubmissionOpen(false);
        }}
        className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 select-none"
      >
        <div className="mx-auto w-full max-w-[1440px] flex items-center justify-between h-13 px-4 sm:px-6 lg:px-8">
          {/* Left Section: Logo & Brand + Separator */}
          <div className="flex items-center h-full gap-1.5">
            <Link
              ref={brandContainerRef}
              href="/"
              onMouseLeave={handleMouseLeave}
              className="relative flex items-center gap-2.5 group cursor-pointer py-1"
            >
              {/* Logo target */}
              <div
                ref={logoRef}
                onMouseEnter={() => handleMouseEnter("logo")}
                className="relative flex items-center justify-center w-6 h-6 shrink-0"
              >
                <Image
                  src="/eizoki.webp"
                  alt="Eizoki logo"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>

              {/* Brand text target */}
              <div
                ref={textRef}
                onMouseEnter={() => handleMouseEnter("text")}
                className="relative inline-flex items-center"
              >
                <span className="text-[14.5px] font-medium tracking-tight text-zinc-900 group-hover:text-zinc-950 transition-colors duration-150">
                  eizoki
                </span>
              </div>

              {/* Single Inspect Selection Box that slides with constant opacity */}
              <AnimatePresence>
                {hoveredBrandItem && boxRect && (
                  <motion.div
                    key="brand-inspect-box"
                    aria-hidden="true"
                    initial={{
                      opacity: 0,
                      scale: 0.65,
                      rotate: 0,
                      x: boxRect.x,
                      y: boxRect.y,
                      width: boxRect.width,
                      height: boxRect.height,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: tilt,
                      x: boxRect.x,
                      y: boxRect.y,
                      width: boxRect.width,
                      height: boxRect.height,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.65,
                      rotate: 0,
                    }}
                    transition={{
                      x: {
                        type: "spring",
                        stiffness: 210,
                        damping: 21,
                        mass: 0.9,
                      },
                      y: {
                        type: "spring",
                        stiffness: 210,
                        damping: 21,
                        mass: 0.9,
                      },
                      width: {
                        type: "spring",
                        stiffness: 195,
                        damping: 19,
                        mass: 0.9,
                      },
                      height: {
                        type: "spring",
                        stiffness: 195,
                        damping: 19,
                        mass: 0.9,
                      },
                      scale: {
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        mass: 0.8,
                      },
                      rotate: {
                        type: "spring",
                        stiffness: 170,
                        damping: 11,
                        mass: 0.7,
                      },
                      opacity: {
                        duration: 0.15,
                      },
                    }}
                    className="absolute top-0 left-0 border border-brand pointer-events-none origin-center z-10"
                  >
                    {/* 4 Corner Square Handles */}
                    <span className="absolute -top-[3px] -left-[3px] w-[5px] h-[5px] bg-white border border-brand" />
                    <span className="absolute -top-[3px] -right-[3px] w-[5px] h-[5px] bg-white border border-brand" />
                    <span className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] bg-white border border-brand" />
                    <span className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] bg-white border border-brand" />

                    {/* Dimension Pill Badge */}
                    <span className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 bg-brand text-on-brand text-[9px] font-mono leading-none px-1.5 py-0.5 rounded-[3px] shadow-xs whitespace-nowrap">
                      {hoveredBrandItem === "logo" ? "24 × 24" : "48 × 16"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>

            {/* Simple | Separator */}
            <span
              className="text-zinc-300 font-light select-none text-xs px-2"
              aria-hidden="true"
            >
              |
            </span>

            {/* Left-Center Navigation Cluster */}
            <nav
              ref={navClusterRef}
              onMouseLeave={handleNavLeave}
              className="relative flex items-center gap-1"
              aria-label="Main Navigation"
            >
              {/* Shared hover pill that slides between My Videos and Favourites */}
              <AnimatePresence>
                {hoveredNavItem && navPillRect && (
                  <motion.div
                    key="nav-hover-pill"
                    aria-hidden="true"
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      x: navPillRect.x,
                      y: navPillRect.y,
                      width: navPillRect.width,
                      height: navPillRect.height,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: navPillRect.x,
                      y: navPillRect.y,
                      width: navPillRect.width,
                      height: navPillRect.height,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      x: {
                        type: "spring",
                        stiffness: 430,
                        damping: 32,
                        mass: 0.7,
                      },
                      y: {
                        type: "spring",
                        stiffness: 430,
                        damping: 32,
                        mass: 0.7,
                      },
                      width: {
                        type: "spring",
                        stiffness: 430,
                        damping: 32,
                        mass: 0.7,
                      },
                      height: {
                        type: "spring",
                        stiffness: 430,
                        damping: 32,
                        mass: 0.7,
                      },
                      scale: {
                        type: "spring",
                        stiffness: 400,
                        damping: 26,
                      },
                      opacity: { duration: 0.12 },
                    }}
                    className="absolute top-0 left-0 rounded-full bg-zinc-100/80 border border-white pointer-events-none z-0"
                  />
                )}
              </AnimatePresence>

              {/* Keyed by account so menu state (open, "Signing out…") never
                  survives a sign-out and a later sign-in without a reload. */}
              <AccountControl
                key={clerkUser?.id ?? "signed-out"}
                onLogin={handleLoginClick}
              />
              {/* My Videos & Favourites share the sliding highlight */}
              <Link
                ref={myVideosRef}
                href="/my-videos"
                onMouseEnter={() => handleNavEnter("my-videos")}
                className="relative z-10 block px-2 sm:px-3 py-1 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 border border-transparent active:scale-[0.97] transition-[color,transform] duration-150 cursor-pointer"
              >
                My Videos
              </Link>
              <Link
                ref={favouritesRef}
                href="/favourites"
                onMouseEnter={() => handleNavEnter("favourites")}
                className="relative z-10 hidden min-[480px]:block px-3 py-1 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 border border-transparent active:scale-[0.97] transition-[color,transform] duration-150 cursor-pointer"
              >
                Favourites
              </Link>
            </nav>
          </div>

          {/* Center: raised 3D search trigger (button, not an input) */}
          <div className="flex-1 mr-30 hidden md:flex items-center justify-center">
            <button
              ref={searchPillRef}
              type="button"
              onClick={() => openSearch("pill")}
              aria-haspopup="dialog"
              aria-expanded={search?.open === true}
              aria-keyshortcuts="Meta+K Control+K /"
              aria-label="Search motions and prompts"
              className={`group relative h-9 w-[112px] flex items-center justify-center gap-1.5 rounded-full cursor-pointer border border-white bg-[linear-gradient(180deg,var(--raised-top)_0%,var(--raised-mid)_52%,var(--raised-bottom)_100%)] text-zinc-900 shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(9,9,11,0.06),0_4px_10px_-4px_rgba(9,9,11,0.14),0_12px_26px_-14px_rgba(9,9,11,0.22)] transition-[box-shadow,border-color,color] duration-200 ease-out hover:border-white hover:shadow-[inset_0_1px_0_var(--raised-highlight),inset_0_-1px_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(9,9,11,0.07),0_6px_14px_-5px_rgba(9,9,11,0.16),0_16px_32px_-16px_rgba(9,9,11,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.985] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9),0_1px_1px_rgba(9,9,11,0.05)] ${
                search?.origin === "pill" ? "opacity-0" : ""
              }`}
            >
              <Search
                className="w-[15px] h-[15px] text-zinc-500 shrink-0 transition-colors duration-200 group-hover:text-zinc-700"
                strokeWidth={1.7}
              />
              <span className="text-[14px] font-semibold tracking-tight text-zinc-600 transition-colors duration-200 group-hover:text-zinc-800">
                Search
              </span>
            </button>
          </div>

          {/* Right Section: search icon, sponsors, admin and Submit */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* The centre search button only fits from md up. */}
            <button
              ref={searchIconRef}
              type="button"
              onClick={() => openSearch("icon")}
              aria-haspopup="dialog"
              aria-expanded={search?.open === true}
              aria-label="Search motions and prompts"
              className={`w-7 h-7 -mr-1 rounded-full flex md:hidden items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70 border border-transparent hover:border-white active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer ${
                search?.origin === "icon" ? "opacity-0" : ""
              }`}
            >
              <Search className="w-4 h-4" strokeWidth={1.8} />
            </button>

            {sponsorSlot}

            {isAdmin && (
              <HoverHint label="Admin">
                <Link
                  href="/admin"
                  aria-label="Admin"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-brand hover:bg-brand/5 border border-transparent active:scale-[0.96] transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.8} />
                </Link>
              </HoverHint>
            )}

            {/* Tactile "Submit" button in the theme brand colour with 3D top highlight */}
            <button
              type="button"
              onClick={handleSubmitClick}
              aria-haspopup="dialog"
              className="group relative inline-flex items-center justify-center px-3.5 py-1 text-[12.5px] font-medium text-on-brand rounded-full bg-brand border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_var(--brand-shadow)] hover:bg-brand-600 active:scale-[0.96] transition-[background-color,transform,box-shadow] duration-150 ease-out cursor-pointer"
            >
              <span>Submit</span>
            </button>
          </div>
        </div>
      </header>
      {submissionOpen && (
        <SubmissionDialog
          onClose={() => setSubmissionOpen(false)}
          onRestricted={(code) => {
            setSubmissionOpen(false);
            setRestriction(code);
          }}
        />
      )}
      {/* `custom` hands the closing panel the trigger's latest position. */}
      <AnimatePresence
        custom={search?.rect}
        onExitComplete={() =>
          setSearch((current) => (current?.open ? current : null))
        }
      >
        {search?.open && (
          <SearchDialog
            key="search"
            origin={search.origin}
            originRect={search.rect}
            onClose={closeSearch}
          />
        )}
      </AnimatePresence>
      {restriction && (
        <RestrictionNotice
          code={restriction}
          onClose={() => setRestriction(null)}
        />
      )}
    </>
  );
}
