"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Plus, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLoginModal } from "@/components/login-modal";

interface NavbarProps {
  onSearchClick?: () => void;
  onSubmitClick?: () => void;
  onLoginClick?: () => void;
}

/**
 * Every sponsor link goes out with the same attribution so sponsors can see
 * exactly where the traffic came from. Future sponsors should use this helper.
 */
const SPONSOR_UTM = {
  source: "eizoki.com",
  medium: "sponsorship",
  campaign: "eizoki_sponsorship",
} as const;

function withSponsorUtm(href: string) {
  const url = new URL(href);
  url.searchParams.set("utm_source", SPONSOR_UTM.source);
  url.searchParams.set("utm_medium", SPONSOR_UTM.medium);
  url.searchParams.set("utm_campaign", SPONSOR_UTM.campaign);
  return url.toString();
}

function HoverHint({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative flex items-center"
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
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 whitespace-nowrap rounded-[6px] border border-zinc-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f9_100%)] px-2 py-[3px] text-[10.5px] font-medium leading-normal tracking-tight text-zinc-800 shadow-[inset_0_2px_3px_rgba(9,9,11,0.10),inset_0_1px_0_rgba(9,9,11,0.04),inset_0_-1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(9,9,11,0.06),0_4px_14px_rgba(9,9,11,0.10)]"
          >
            {label}
            <span
              aria-hidden="true"
              className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 rounded-[1px] border-l border-t border-zinc-200/90 bg-[#fcfcfc]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({ onSearchClick, onSubmitClick, onLoginClick }: NavbarProps) {
  const { openLoginModal } = useLoginModal();

  const handleLoginClick = onLoginClick ?? openLoginModal;
  const handleSubmitClick = onSubmitClick ?? openLoginModal;

  const [hoveredBrandItem, setHoveredBrandItem] = useState<"logo" | "text" | null>(null);
  const [boxRect, setBoxRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tilt, setTilt] = useState(0);

  const [hoveredNavItem, setHoveredNavItem] = useState<"favourites" | "info" | null>(null);
  const [navPillRect, setNavPillRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brandContainerRef = useRef<HTMLAnchorElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const prevXRef = useRef<number | null>(null);

  const navClusterRef = useRef<HTMLElement>(null);
  const favouritesRef = useRef<HTMLAnchorElement>(null);
  const infoRef = useRef<HTMLAnchorElement>(null);

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

  const handleNavEnter = (target: "favourites" | "info") => {
    const container = navClusterRef.current;
    const el = target === "favourites" ? favouritesRef.current : infoRef.current;
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
    <header
      className={`sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 select-none transition-transform duration-300 ease-out ${
        isScrolled ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto w-full max-w-7xl flex items-center justify-between h-13 px-4 sm:px-6 lg:px-8">
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
              <span className="text-[14.5px] font-medium tracking-tight text-zinc-900 group-hover:text-black transition-colors duration-150">
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
                  className="absolute top-0 left-0 border border-[#3074FE] pointer-events-none origin-center z-10"
                >
                  {/* 4 Corner Square Handles */}
                  <span className="absolute -top-[3px] -left-[3px] w-[5px] h-[5px] bg-white border border-[#3074FE]" />
                  <span className="absolute -top-[3px] -right-[3px] w-[5px] h-[5px] bg-white border border-[#3074FE]" />
                  <span className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] bg-white border border-[#3074FE]" />
                  <span className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] bg-white border border-[#3074FE]" />

                  {/* Dimension Pill Badge */}
                  <span className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 bg-[#3074FE] text-white text-[9px] font-mono leading-none px-1.5 py-0.5 rounded-[3px] shadow-xs whitespace-nowrap">
                    {hoveredBrandItem === "logo" ? "24 × 24" : "48 × 16"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Simple | Separator */}
          <span className="text-zinc-300 font-light select-none text-xs px-2" aria-hidden="true">
            |
          </span>

          {/* Left-Center Navigation Cluster */}
          <nav
            ref={navClusterRef}
            onMouseLeave={handleNavLeave}
            className="relative flex items-center gap-1"
            aria-label="Main Navigation"
          >
            {/* Shared hover pill that slides between Favourites and Info */}
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

            {/* Login button with #3074FE and 3D top-light highlight */}
            <button
              type="button"
              onClick={handleLoginClick}
              className="relative z-10 px-3.5 py-1 rounded-full text-[12.5px] font-medium bg-[#3074FE] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_rgba(48,116,254,0.3)] border border-white/20 active:scale-[0.97] hover:bg-[#2568f2] transition-[background-color,transform,box-shadow] duration-150 ease-out cursor-pointer"
            >
              Login
            </button>
            {/* Favourites & Info share the sliding highlight */}
            <Link
              ref={favouritesRef}
              href="/favourites"
              onMouseEnter={() => handleNavEnter("favourites")}
              className="relative z-10 px-3 py-1 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 border border-transparent active:scale-[0.97] transition-[color,transform] duration-150 cursor-pointer"
            >
              Favourites
            </Link>
            <Link
              ref={infoRef}
              href="/info"
              onMouseEnter={() => handleNavEnter("info")}
              className="relative z-10 px-3 py-1 rounded-full text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 border border-transparent active:scale-[0.97] transition-[color,transform] duration-150 cursor-pointer"
            >
              Info
            </Link>
          </nav>
        </div>

        {/* Center: raised 3D search trigger (button, not an input) */}
        <div className="flex-1 mr-30 hidden md:flex items-center justify-center">
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search motions and prompts"
            className="group relative h-9 w-[112px] flex items-center justify-center gap-1.5 rounded-full cursor-pointer border border-white bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_52%,#f1f1f3_100%)] text-zinc-900 shadow-[inset_0_1px_0_#ffffff,inset_0_-1px_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(9,9,11,0.06),0_4px_10px_-4px_rgba(9,9,11,0.14),0_12px_26px_-14px_rgba(9,9,11,0.22)] transition-[box-shadow,border-color,color] duration-200 ease-out hover:border-white hover:shadow-[inset_0_1px_0_#ffffff,inset_0_-1px_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(9,9,11,0.07),0_6px_14px_-5px_rgba(9,9,11,0.16),0_16px_32px_-16px_rgba(9,9,11,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.985] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9),0_1px_1px_rgba(9,9,11,0.05)]"
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

        {/* Right Section: Plus, Tactile Submit button & Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Sponsored slot: DaemonDoc (opens in a new tab) */}
          <HoverHint label="DaemonDoc">
            <a
              href={withSponsorUtm("https://daemondoc.online")}
              target="_blank"
              rel="sponsored noopener noreferrer"
              aria-label="DaemonDoc — opens in a new tab"
              className="relative w-7 h-7 rounded-[7px] flex items-center justify-center overflow-hidden bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(9,9,11,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 active:scale-[0.94] transition-transform duration-150 cursor-pointer"
            >
              <Image
                src="/DaemonDoc.webp"
                alt="DaemonDoc"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </a>
          </HoverHint>

          {/* Reserved slot for future sponsors / featured projects */}
          <HoverHint label="Become a Sponsor">
            <button
              type="button"
              aria-label="Become a Sponsor"
              className="relative w-7 h-7 rounded-[7px] flex items-center justify-center text-zinc-400 bg-zinc-50/40 border border-dashed border-zinc-300 hover:text-[#3074FE] hover:bg-[#3074FE]/5 hover:border-[#3074FE]/70 focus-visible:outline-none focus-visible:border-[#3074FE] focus-visible:text-[#3074FE] active:scale-[0.94] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.9} />
            </button>
          </HoverHint>

          {/* Tactile "Submit" button with #3074FE and 3D top highlight */}
          <button
            type="button"
            onClick={handleSubmitClick}
            className="group relative inline-flex items-center justify-center px-3.5 py-1 text-[12.5px] font-medium text-white rounded-full bg-[#3074FE] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_rgba(48,116,254,0.3)] hover:bg-[#2568f2] active:scale-[0.96] transition-[background-color,transform,box-shadow] duration-150 ease-out cursor-pointer"
          >
            <span>Submit</span>
          </button>

          {/* Settings / Gear icon button */}
          <button
            type="button"
            aria-label="Preferences"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70 border border-transparent hover:border-white active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
