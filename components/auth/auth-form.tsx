"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { useAuthFlow } from "./use-auth-flow";
import { GoogleIcon, XIcon } from "./provider-icons";
import CodeSlots from "./CodeSlots";

const inputClass =
  "mt-2 h-11 w-full rounded-[10px] border border-zinc-300 bg-white px-3.5 text-[14px] text-zinc-900 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#3074FE] focus:ring-4 focus:ring-[#3074FE]/15 disabled:opacity-60";
const primaryClass =
  "mt-3.5 flex h-11 w-full items-center justify-center rounded-full border border-white/20 bg-[#3074FE] text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_4px_rgba(48,116,254,0.3)] transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-[#2568f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.97] cursor-pointer disabled:cursor-wait disabled:opacity-60";
const socialClass =
  "flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 text-[14px] font-medium text-zinc-900 transition-[background-color,transform] duration-150 hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3074FE]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-60";
const quietClass =
  "rounded text-[12px] text-zinc-600 underline underline-offset-4 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#3074FE] disabled:opacity-50";

export function AuthForm({
  titleId,
  emailRef,
  onSuccess,
}: {
  titleId: string;
  emailRef: RefObject<HTMLInputElement | null>;
  onSuccess: () => void;
}) {
  const flow = useAuthFlow(onSuccess);
  const emailId = useId();
  const codeId = useId();
  const statusId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const isCode =
    flow.step === "code" || flow.step === "signup-code" || flow.step === "mfa";

  useEffect(() => {
    if (isCode) codeRef.current?.focus();
  }, [isCode]);

  const title = isCode
    ? flow.step === "mfa"
      ? "Verify your identity"
      : "Check your email"
    : flow.step === "details"
      ? "Complete your account"
      : "Log in to Eizoki";
  const address =
    flow.email || flow.signUp.emailAddress || flow.signIn.identifier;
  const submit = isCode
    ? flow.step === "mfa"
      ? flow.verifySecondFactor
      : flow.verify
    : flow.step === "details"
      ? flow.completeDetails
      : flow.sendEmail;

  return (
    <>
      <h2
        id={titleId}
        className="mt-4 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-zinc-900 sm:text-[23px]"
      >
        {title}
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-zinc-500">
        {flow.step === "start"
          ? "Save the work you love. Keep your references together."
          : flow.step === "details"
            ? "Add the details needed to finish signing up."
            : flow.step === "mfa"
              ? "Complete the additional verification for your account."
              : `Enter the verification code for ${address || "your email address"}.`}
      </p>
      {flow.step === "start" && (
        <>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              disabled={flow.busy}
              onClick={() => flow.provider("Google")}
              className={socialClass}
            >
              <GoogleIcon className="h-[17px] w-[17px] shrink-0" />
              Continue with Google
            </button>
            <button
              type="button"
              disabled={flow.busy}
              onClick={() => flow.provider("X")}
              className={socialClass}
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
        </>
      )}
      <form
        className={flow.step === "start" ? "" : "mt-5"}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        aria-busy={flow.busy}
        noValidate
      >
        {(flow.step === "start" ||
          (flow.step === "details" &&
            flow.missingFields.includes("email_address"))) && (
          <>
            <label
              htmlFor={emailId}
              className="block text-[13px] text-zinc-600"
            >
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
              value={flow.email}
              onChange={(event) => flow.setEmail(event.target.value)}
              disabled={flow.busy}
              aria-invalid={flow.error ? true : undefined}
              aria-describedby={flow.error ? statusId : undefined}
              className={inputClass}
            />
          </>
        )}
        {flow.step === "details" && (
          <div className="space-y-3">
            {flow.missingFields.includes("first_name") && (
              <label className="block text-[13px] text-zinc-600">
                First name
                <input
                  name="given-name"
                  autoComplete="given-name"
                  className={inputClass}
                  value={flow.firstName}
                  onChange={(e) => flow.setFirstName(e.target.value)}
                  disabled={flow.busy}
                />
              </label>
            )}
            {flow.missingFields.includes("last_name") && (
              <label className="block text-[13px] text-zinc-600">
                Last name
                <input
                  name="family-name"
                  autoComplete="family-name"
                  className={inputClass}
                  value={flow.lastName}
                  onChange={(e) => flow.setLastName(e.target.value)}
                  disabled={flow.busy}
                />
              </label>
            )}
            {flow.missingFields.includes("legal_accepted") && (
              <label className="mt-3 flex items-start gap-2 text-[13px] text-zinc-600">
                <input
                  type="checkbox"
                  checked={flow.legalAccepted}
                  onChange={(e) => flow.setLegalAccepted(e.target.checked)}
                  disabled={flow.busy}
                />
                I agree to the terms and privacy policy below
              </label>
            )}
          </div>
        )}
        {flow.step === "mfa" && (
          <label className="block text-[13px] text-zinc-600">
            Verification method
            <select
              className={inputClass}
              value={flow.factor}
              onChange={(e) => {
                flow.setFactor(e.target.value);
                flow.setCode("");
              }}
              disabled={flow.busy}
            >
              <option
                value="totp"
                disabled={
                  !flow.signIn.supportedSecondFactors.some(
                    (f) => f.strategy === "totp",
                  )
                }
              >
                Authenticator app
              </option>
              {flow.signIn.supportedSecondFactors
                .filter((f) =>
                  ["email_code", "phone_code", "backup_code"].includes(
                    f.strategy,
                  ),
                )
                .map((f) => (
                  <option key={f.strategy} value={f.strategy}>
                    {f.strategy === "email_code"
                      ? "Email code"
                      : f.strategy === "phone_code"
                        ? "SMS code"
                        : "Backup code"}
                  </option>
                ))}
            </select>
          </label>
        )}
        {isCode && (
          <>
            {flow.step === "mfa" && flow.factor === "backup_code" ? (
              <>
                <label
                  htmlFor={codeId}
                  className="mt-3 block text-[13px] text-zinc-600"
                >
                  Backup code
                </label>
                <input
                  ref={codeRef}
                  id={codeId}
                  name="code"
                  type="text"
                  autoComplete="off"
                  value={flow.code}
                  onChange={(e) => flow.setCode(e.target.value)}
                  disabled={flow.busy}
                  aria-invalid={flow.error ? true : undefined}
                  aria-describedby={flow.error ? statusId : undefined}
                  className={`${inputClass} text-center font-mono`}
                />
              </>
            ) : (
              <div className="mt-3">
                <p className="text-[13px] text-zinc-600">Verification code</p>
                <div className="mt-3 flex justify-center">
                  <CodeSlots
                    key={`${flow.step}-${flow.factor}`}
                    length={6}
                    value={flow.code}
                    status={flow.codeStatus}
                    onChange={flow.setCode}
                    onComplete={(code: string) => {
                      void (flow.step === "mfa"
                        ? flow.verifySecondFactor(code)
                        : flow.verify(code));
                    }}
                    disabled={flow.busy && flow.codeStatus !== "success"}
                    autoFocus
                    ariaLabel="Verification code"
                    ariaDescribedBy={flow.error ? statusId : undefined}
                    accentColor="#3074FE"
                    inkColor="#2563eb"
                    slotColor="#f4f4f5"
                    digitColor="#ffffff"
                    dangerColor="#dc2626"
                    slotSize={36}
                    gap={6}
                    radius={10}
                  />
                </div>
              </div>
            )}
          </>
        )}
        <button
          type="submit"
          disabled={flow.busy || (isCode && flow.codeStatus !== "idle")}
          className={primaryClass}
        >
          {flow.busy
            ? "Please wait…"
            : isCode
              ? "Verify and continue"
              : flow.step === "details"
                ? "Continue"
                : "Continue with email"}
        </button>
        <p
          id={statusId}
          role={flow.error ? "alert" : "status"}
          aria-live="polite"
          className={`mt-2.5 text-center text-[12px] leading-relaxed ${flow.error ? "text-red-600" : "text-zinc-500"} ${flow.error || flow.notice ? "" : "sr-only"}`}
        >
          {flow.error ?? flow.notice ?? ""}
        </p>
      </form>
      {flow.step !== "start" && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className={quietClass}
            disabled={flow.busy}
            onClick={flow.restart}
          >
            {flow.step === "code" ? "Change email" : "Start again"}
          </button>
          {flow.step !== "details" && flow.step !== "mfa" && (
            <button
              type="button"
              className={quietClass}
              disabled={flow.busy || flow.cooldown > 0}
              onClick={flow.resend}
            >
              {flow.cooldown ? `Resend in ${flow.cooldown}s` : "Resend code"}
            </button>
          )}
          {flow.step === "mfa" &&
            ["email_code", "phone_code"].includes(flow.factor) && (
              <button
                type="button"
                className={quietClass}
                disabled={flow.busy || flow.cooldown > 0}
                onClick={flow.sendSecondFactor}
              >
                {flow.cooldown ? `Resend in ${flow.cooldown}s` : "Send code"}
              </button>
            )}
        </div>
      )}
      <div id="clerk-captcha" />
    </>
  );
}
