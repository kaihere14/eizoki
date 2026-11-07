"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

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

  const openLoginModal = useCallback(() => setIsOpen(true), []);
  const closeLoginModal = useCallback(() => setIsOpen(false), []);

  return (
    <LoginModalContext.Provider
      value={{ isOpen, openLoginModal, closeLoginModal }}
    >
      {children}
      <LoginModal open={isOpen} onClose={closeLoginModal} />
    </LoginModalContext.Provider>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      focusable="false"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const emailId = useId();
  const statusId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Lock the page, trap focus, and restore focus on close. The dialog unmounts
  // when it closes, so the form always reopens empty.
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

  const handleProvider = (provider: "Google" | "X") => {
    setError(null);
    setNotice(`${provider} sign-in isn't connected yet.`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = email.trim();

    if (!EMAIL_PATTERN.test(value)) {
      setNotice(null);
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }

    setError(null);
    // TODO: hand off to the real auth provider once it is wired up.
    setNotice(`We've sent a sign-in link to ${value}.`);
  };

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
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.965 }
        }
        animate={
          shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        exit={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.975 }
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
            className="-mt-1.5 -mr-2 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-[color,background-color,transform] duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.94]"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        </div>

        <h2
          id={titleId}
          className="mt-4 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-zinc-900 sm:text-[23px]"
        >
          Log in to Eizoki
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-zinc-500">
          Save the work you love. Keep your references together.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => handleProvider("Google")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 text-[14px] font-medium text-zinc-900 transition-[background-color,transform] duration-150 hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99]"
          >
            <GoogleIcon className="h-[17px] w-[17px] shrink-0" />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleProvider("X")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 text-[14px] font-medium text-zinc-900 transition-[background-color,transform] duration-150 hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99]"
          >
            <XIcon className="h-[14px] w-[14px] shrink-0" />
            Continue with X
          </button>
        </div>

        <div
          aria-hidden="true"
          className="my-5 flex items-center gap-3 text-[12px] text-zinc-400"
        >
          <span className="h-px flex-1 bg-zinc-200" />
          <span className="whitespace-nowrap">or continue with email</span>
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor={emailId} className="block text-[13px] text-zinc-600">
            Email address
          </label>

          <input
            ref={emailRef}
            id={emailId}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? statusId : undefined}
            className="mt-2 h-11 w-full rounded-[10px] border border-zinc-300 bg-white px-3.5 text-[14px] text-zinc-900 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#3074FE] focus:ring-4 focus:ring-[#3074FE]/15"
          />

          <button
            type="submit"
            className="mt-3.5 flex h-11 w-full items-center justify-center rounded-full bg-[#3074FE] text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_-4px_rgba(48,116,254,0.55)] transition-[background-color,transform,box-shadow] duration-150 hover:bg-[#2568f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99]"
          >
            Continue with email
          </button>

          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className={`mt-2.5 text-center text-[12px] leading-relaxed ${
              error ? "text-red-600" : "text-zinc-500"
            } ${error || notice ? "" : "sr-only"}`}
          >
            {error ?? notice ?? ""}
          </p>
        </form>

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
