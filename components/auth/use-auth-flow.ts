"use client";

import { useRef, useState, useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { usePathname, useRouter } from "next/navigation";
import type { SetActiveNavigate } from "@clerk/nextjs/types";
import {
  clearAuthReturn,
  getAuthReturn,
  rememberAuthReturn,
} from "@/lib/auth-navigation";

export function authErrorMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    return (
      error.errors[0]?.longMessage ||
      error.errors[0]?.message ||
      "Authentication failed. Please try again."
    );
  }
  if (
    error &&
    typeof error === "object" &&
    "longMessage" in error &&
    typeof error.longMessage === "string"
  )
    return error.longMessage;
  return "We couldn’t complete that request. Please try again.";
}

export function useAuthFlow(onSuccess: () => void) {
  const clerk = useClerk();
  const reduceMotion = useReducedMotion();
  const [codeStatus, setCodeStatus] = useState<"idle" | "error" | "success">(
    "idle",
  );
  const {
    signIn,
    errors: signInErrors,
    fetchStatus: signInFetch,
  } = useSignIn();
  const {
    signUp,
    errors: signUpErrors,
    fetchStatus: signUpFetch,
  } = useSignUp();
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [factor, setFactor] = useState("totp");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  /** Set while the browser is leaving for an OAuth provider. */
  const [redirecting, setRedirecting] = useState<"Google" | "X" | null>(null);
  const running = useRef(false);

  // Returning with the Back button restores this page from the bfcache with
  // the spinner still showing; clear it so the buttons work again.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(null);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  /**
   * Clerk keeps the last sign-in attempt on the client. After signing out
   * (without a reload) that attempt is already complete, and starting a new
   * flow on it does nothing. Clear any finished or stale attempt first.
   */
  const freshAttempt = async () => {
    if (signIn.id) await signIn.reset();
    if (signUp.id) await signUp.reset();
  };

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown(Math.max(0, cooldown - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const signup = signingUp || pathname === "/sign-in/continue";
  const missingFields = signup ? signUp.missingFields : [];
  const requiresMfa =
    signIn.status === "needs_second_factor" ||
    signIn.status === "needs_client_trust";
  const signupCode =
    signup &&
    !missingFields.length &&
    signUp.unverifiedFields.includes("email_address");
  const step = requiresMfa
    ? "mfa"
    : signupCode
      ? "signup-code"
      : signup
        ? "details"
        : sent
          ? "code"
          : "start";
  const supportedFactors = signIn.supportedSecondFactors.filter((f) =>
    ["totp", "email_code", "phone_code", "backup_code"].includes(f.strategy),
  );
  const selectedFactor = supportedFactors.some((f) => f.strategy === factor)
    ? factor
    : supportedFactors[0]?.strategy || factor;
  const busy =
    working ||
    redirecting !== null ||
    signInFetch === "fetching" ||
    signUpFetch === "fetching" ||
    !clerk.loaded;

  const run = async (action: () => Promise<void>, verification = false) => {
    if (running.current || !clerk.loaded) return;
    running.current = true;
    setWorking(true);
    if (verification) setCodeStatus("idle");
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setError(authErrorMessage(error));
      if (verification) setCodeStatus("error");
    } finally {
      running.current = false;
      setWorking(false);
    }
  };

  const navigate: SetActiveNavigate = async ({ session, decorateUrl }) => {
    const destination = session?.currentTask
      ? "/sign-in/tasks"
      : getAuthReturn();
    const url = decorateUrl(destination);
    if (!session?.currentTask) {
      if (step === "code" || step === "signup-code" || step === "mfa") {
        setCodeStatus("success");
        if (!reduceMotion)
          await new Promise((resolve) => window.setTimeout(resolve, 550));
      }
      clearAuthReturn();
      onSuccess();
    }
    if (url.startsWith("http")) window.location.assign(url);
    else {
      router.replace(url);
      router.refresh();
    }
  };

  const finish = async (kind: "signin" | "signup") => {
    const resource = kind === "signin" ? signIn : signUp;
    if (resource.status !== "complete") return false;
    const result = await resource.finalize({ navigate });
    if (result.error) throw result.error;
    return true;
  };

  const sendEmail = () =>
    run(async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
      if (!pathname.startsWith("/sign-in")) rememberAuthReturn();
      await freshAttempt();
      const created = await signIn.create({
        identifier: email.trim(),
        signUpIfMissing: true,
      });
      if (created.error) throw created.error;
      const sent = await signIn.emailCode.sendCode();
      if (sent.error) throw sent.error;
      setSent(true);
      setCode("");
      setCooldown(30);
    });

  const verify = (submittedCode = code) =>
    run(async () => {
      if (!submittedCode.trim()) {
        setError("Enter your verification code.");
        return;
      }
      if (step === "signup-code") {
        const result = await signUp.verifications.verifyEmailCode({
          code: submittedCode.trim(),
        });
        if (result.error) throw result.error;
        await finish("signup");
        return;
      }
      const result = await signIn.emailCode.verifyCode({
        code: submittedCode.trim(),
      });
      const transferable =
        result.error &&
        isClerkAPIResponseError(result.error) &&
        result.error.errors.some(
          (e) => e.code === "sign_up_if_missing_transfer",
        );
      if (transferable) {
        const transferred = await signUp.create({ transfer: true });
        if (transferred.error) throw transferred.error;
        setSigningUp(true);
        await finish("signup");
      } else {
        if (result.error) throw result.error;
        if (!(await finish("signin"))) {
          if (
            signIn.status === "needs_second_factor" ||
            signIn.status === "needs_client_trust"
          ) {
            setCode("");
            setCooldown(0);
          } else
            setError(
              "Another verification step is required. Please start again.",
            );
        }
      }
    }, true);

  const resend = () =>
    run(async () => {
      if (cooldown) return;
      const result =
        step === "signup-code"
          ? await signUp.verifications.sendEmailCode()
          : await signIn.emailCode.sendCode();
      if (result.error) throw result.error;
      setCooldown(30);
      setNotice("A new verification code has been sent.");
    });

  const provider = (name: "Google" | "X") =>
    run(async () => {
      if (!pathname.startsWith("/sign-in")) rememberAuthReturn();
      // Stays set on success: the page is navigating away to the provider.
      setRedirecting(name);
      try {
        await freshAttempt();
        const result = await signIn.sso({
          strategy: name === "Google" ? "oauth_google" : "oauth_x",
          redirectCallbackUrl: "/sso-callback",
          redirectUrl: "/sign-in/tasks",
        });
        if (result.error) throw result.error;
      } catch (error) {
        setRedirecting(null);
        throw error;
      }
    });

  const completeDetails = () =>
    run(async () => {
      const supported = [
        "email_address",
        "first_name",
        "last_name",
        "legal_accepted",
      ];
      if (missingFields.some((field) => !supported.includes(field))) {
        setError(
          "Your account needs an additional step that isn’t enabled here. Please contact support.",
        );
        return;
      }
      const result = await signUp.update({
        ...(missingFields.includes("email_address")
          ? { emailAddress: email.trim() }
          : {}),
        ...(missingFields.includes("first_name")
          ? { firstName: firstName.trim() }
          : {}),
        ...(missingFields.includes("last_name")
          ? { lastName: lastName.trim() }
          : {}),
        ...(missingFields.includes("legal_accepted") ? { legalAccepted } : {}),
      });
      if (result.error) throw result.error;
      if (await finish("signup")) return;
      if (
        signUp.unverifiedFields.includes("email_address") &&
        !signUp.missingFields.length
      ) {
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
        setCode("");
        setCooldown(30);
      }
    });

  const sendSecondFactor = () =>
    run(async () => {
      if (cooldown) return;
      const result =
        selectedFactor === "email_code"
          ? await signIn.mfa.sendEmailCode()
          : await signIn.mfa.sendPhoneCode();
      if (result.error) throw result.error;
      setCooldown(30);
      setNotice("A verification code has been sent.");
    });

  const verifySecondFactor = (submittedCode = code) =>
    run(async () => {
      const params = { code: submittedCode.trim() };
      const result =
        selectedFactor === "email_code"
          ? await signIn.mfa.verifyEmailCode(params)
          : selectedFactor === "phone_code"
            ? await signIn.mfa.verifyPhoneCode(params)
            : selectedFactor === "backup_code"
              ? await signIn.mfa.verifyBackupCode(params)
              : await signIn.mfa.verifyTOTP(params);
      if (result.error) throw result.error;
      await finish("signin");
    }, true);

  const restart = () =>
    run(async () => {
      await signIn.reset();
      await signUp.reset();
      setSent(false);
      setSigningUp(false);
      setCode("");
      setCooldown(0);
      if (pathname.startsWith("/sign-in/")) router.replace("/sign-in");
    });

  const callbackError = (signup ? signUpErrors : signInErrors).global?.[0];
  return {
    email,
    setEmail,
    code,
    setCode: (value: string) => {
      setCode(value);
      setCodeStatus("idle");
    },
    codeStatus,
    error: error || (callbackError ? authErrorMessage(callbackError) : null),
    notice,
    busy,
    redirecting,
    step,
    cooldown,
    signIn,
    signUp,
    missingFields,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    legalAccepted,
    setLegalAccepted,
    factor: selectedFactor,
    setFactor,
    sendEmail,
    verify,
    resend,
    provider,
    completeDetails,
    sendSecondFactor,
    verifySecondFactor,
    restart,
  };
}
