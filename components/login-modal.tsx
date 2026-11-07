"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getAuthReturn } from "@/lib/auth-navigation";

type LoginModalContextValue = {
  isOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
};

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function useLoginModal() {
  const context = useContext(LoginModalContext);

  if (!context) {
    throw new Error("useLoginModal must be used within a LoginModalProvider");
  }

  return context;
}

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute =
    pathname === "/sign-in" || pathname === "/sign-in/continue";

  const openLoginModal = useCallback(() => setIsOpen(true), []);
  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    if (isAuthRoute) router.replace(getAuthReturn());
  }, [isAuthRoute, router]);

  return (
    <LoginModalContext.Provider
      value={{ isOpen: isOpen || isAuthRoute, openLoginModal, closeLoginModal }}
    >
      {children}
      <LoginModal open={isOpen || isAuthRoute} onClose={closeLoginModal} />
    </LoginModalContext.Provider>
  );
}

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && <LoginDialog onClose={onClose} />}
    </AnimatePresence>
  );
}

function LoginDialog({ onClose }: { onClose: () => void }) {
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Lock the page, trap focus, and restore focus on close. The dialog unmounts
  // when it closes; Clerk preserves any in-progress verification securely.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 80);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      key="login-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Dimmed, blurred page behind the card */}
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[4px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-[400px] overflow-y-auto rounded-[22px] border border-zinc-200/90 bg-white px-6 py-6 text-zinc-900 shadow-[0_24px_60px_-18px_rgba(9,9,11,0.28),0_2px_8px_rgba(9,9,11,0.06)] outline-none sm:px-7"
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 18, scale: 0.965 }
        }
        animate={
          shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        exit={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 10, scale: 0.975 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.15 }
            : { type: "spring", stiffness: 320, damping: 30, mass: 0.85 }
        }
      >
        <div className="flex items-start justify-between">
          <Image
            src="/eizoki.webp"
            alt=""
            width={44}
            height={44}
            sizes="44px"
            className="h-11 w-11 shrink-0 object-contain"
            priority
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close login"
            className="-mt-1.5 -mr-2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-[color,background-color,transform] duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.94]"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        </div>

        <AuthForm titleId={titleId} emailRef={emailRef} onSuccess={onClose} />

        <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-500">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 hover:decoration-zinc-500"
          >
            terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 hover:decoration-zinc-500"
          >
            privacy policy
          </a>
          .
        </p>
      </motion.div>
    </motion.div>
  );
}
