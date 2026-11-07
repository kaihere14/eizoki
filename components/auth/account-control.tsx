"use client";

import Image from "next/image";
import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useEizokiUser } from "@/components/user-provider";
import { AVATAR_IMAGES } from "@/lib/user";
import { authErrorMessage } from "./use-auth-flow";

const loginClass =
  "relative z-10 px-3.5 py-1 rounded-full text-[12.5px] font-medium bg-[#3074FE] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_rgba(48,116,254,0.3)] border border-white/20 active:scale-[0.97] hover:bg-[#2568f2] transition-[background-color,transform,box-shadow] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3074FE] disabled:opacity-60";

const avatarClass =
  "relative z-10 h-7 w-7 shrink-0 rounded-[7px] overflow-hidden bg-white border border-zinc-200/90 shadow-[0_1px_2px_rgba(9,9,11,0.08)] active:scale-[0.94] hover:shadow-[0_1px_3px_rgba(9,9,11,0.12)] transition-[transform,box-shadow] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3074FE]";

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
      className="h-full w-full object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function AccountControl({ onLogin }: { onLogin: () => void }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { user: account, error: accountError, updateAvatar } = useEizokiUser();
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
                  className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3074FE] ${activeChoice === choice ? "border-[#3074FE] bg-blue-50/50 text-[#2568f2]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
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
          <button
            type="button"
            disabled={busy || savingAvatar !== null}
            className="mt-4 h-9 w-full rounded-lg bg-zinc-100 text-sm text-zinc-900 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-[#3074FE] disabled:opacity-60"
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
