"use client";

import Image from "next/image";
import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useEizokiUser } from "@/components/user-provider";
import { Moon, Sun } from "lucide-react";
import { MODES, THEMES, useTheme } from "@/components/theme-provider";
import { AVATAR_IMAGES } from "@/lib/user";
import { authErrorMessage } from "./use-auth-flow";

const loginClass =
  "relative z-10 px-3.5 py-1 rounded-full text-[12.5px] font-medium bg-brand text-on-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_var(--brand-shadow)] border border-white/20 active:scale-[0.97] hover:bg-brand-600 transition-[background-color,transform,box-shadow] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";

const avatarClass =
  "relative z-10 h-7 w-7 shrink-0 rounded-[7px] overflow-hidden bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(9,9,11,0.08)] active:scale-[0.94] hover:shadow-[0_1px_3px_rgba(9,9,11,0.12)] transition-[transform,box-shadow] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

// Labels stay human-facing; the stored value is the Postgres `Avatar` enum.
const AVATARS = {
  male: { label: "Male", value: "BOY", src: AVATAR_IMAGES.BOY },
  female: { label: "Female", value: "GIRL", src: AVATAR_IMAGES.GIRL },
} as const;
type AvatarChoice = keyof typeof AVATARS;
const DEFAULT_AVATAR = AVATARS.male.src;

function AvatarImage({
  src,
  alt,
  size = 44,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <Image
      src={failedSrc === src ? DEFAULT_AVATAR : src}
      alt={alt}
      width={128}
      height={128}
      sizes={`${size}px`}
      className="h-full w-full object-cover dark:invert"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function AccountControl({ onLogin }: { onLogin: () => void }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { user: account, error: accountError, updateAvatar } = useEizokiUser();
  const { theme, setTheme, mode, setMode } = useTheme();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState<AvatarChoice | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const savingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!isSignedIn || !user)
    return (
      <button
        type="button"
        onClick={onLogin}
        disabled={!isLoaded}
        className={loginClass}
      >
        Login
      </button>
    );

  // The database row is authoritative; until it loads we show the default.
  const activeChoice: AvatarChoice =
    account?.avatar === "GIRL" ? "female" : "male";
  const avatarSrc = AVATARS[activeChoice].src;
  const displayName =
    [account?.firstName, account?.lastName].filter(Boolean).join(" ") ||
    user.fullName ||
    "Your account";
  const displayEmail =
    account?.email ?? user.primaryEmailAddress?.emailAddress;
  const notice = error ?? accountError;

  const selectAvatar = async (choice: AvatarChoice) => {
    if (busy || savingRef.current || activeChoice === choice) return;
    savingRef.current = true;
    setSavingAvatar(choice);
    setError(null);
    setAvatarNotice(null);
    try {
      await updateAvatar(AVATARS[choice].value);
      setAvatarNotice("Avatar updated");
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      savingRef.current = false;
      setSavingAvatar(null);
    }
  };

  return (
    <div ref={containerRef} className="relative z-20">
      <button
        ref={triggerRef}
        type="button"
        className={avatarClass}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => setOpen(!open)}
      >
        <AvatarImage src={avatarSrc} alt="" size={28} />
      </button>
      {open && (
        <div
          id="account-panel"
          className="absolute left-0 top-full mt-3 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(9,9,11,0.12)]"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setOpen(false);
          }}
        >
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(9,9,11,0.08)]">
              <AvatarImage src={avatarSrc} alt="" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {displayEmail}
              </p>
            </div>
          </div>
          <fieldset
            className="mt-4 border-t border-zinc-100 pt-4"
            aria-busy={savingAvatar !== null}
          >
            <legend className="sr-only">Choose avatar</legend>
            <p className="text-xs font-medium text-zinc-600">Choose avatar</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(Object.keys(AVATARS) as AvatarChoice[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-label={`${AVATARS[choice].label} avatar`}
                  aria-pressed={activeChoice === choice}
                  aria-disabled={savingAvatar !== null || busy || !account}
                  onClick={() => void selectAvatar(choice)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${activeChoice === choice ? "border-brand bg-brand-50 text-brand-600" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                >
                  <span className="h-16 w-16 overflow-hidden rounded-[10px]">
                    <AvatarImage src={AVATARS[choice].src} alt="" size={64} />
                  </span>
                  {AVATARS[choice].label}
                </button>
              ))}
            </div>
            <p
              role="status"
              className={
                savingAvatar || avatarNotice
                  ? "mt-2 text-xs text-zinc-500"
                  : "sr-only"
              }
            >
              {savingAvatar ? "Saving avatar…" : avatarNotice}
            </p>
          </fieldset>
          <fieldset className="mt-4 border-t border-zinc-100 pt-4">
            <legend className="sr-only">Color theme</legend>
            <p className="text-xs font-medium text-zinc-600">Color theme</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-theme={option.value}
                  aria-label={`${option.label} theme`}
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${theme === option.value ? "border-brand bg-brand-50 text-brand-600" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full border border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                    style={{ backgroundColor: "var(--brand-500)" }}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4 border-t border-zinc-100 pt-4">
            <legend className="sr-only">Appearance</legend>
            <p className="text-xs font-medium text-zinc-600">Appearance</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {MODES.map((option) => {
                const Icon = option.value === "dark" ? Moon : Sun;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`${option.label} mode`}
                    aria-pressed={mode === option.value}
                    onClick={() => setMode(option.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${mode === option.value ? "border-brand bg-brand-50 text-brand-600" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button
            type="button"
            disabled={busy || savingAvatar !== null}
            className="mt-4 h-9 w-full rounded-lg bg-zinc-100 text-sm text-zinc-900 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await clerk.signOut({ redirectUrl: "/" });
              } catch (error) {
                setError(authErrorMessage(error));
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {notice && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
