"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  cancelVideoUpload,
  restrictionOf,
  uploadSurvives,
  uploadVideoToStorage,
  type FinishedUpload,
} from "@/lib/chunked-upload";
import {
  isVideoContentType,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_LABEL,
} from "@/lib/video-upload-limits";
import type { RestrictionCode } from "@/lib/account-limits";
import {
  sendVideoSubmission,
  submissionMetadata,
  type VideoSubmissionReceipt,
} from "@/lib/video-submission";
import { captureVideoPoster } from "@/lib/video-poster";

export type SubmissionPhase = "idle" | "uploading" | "saving";

export function useVideoSubmission(
  isAdmin: boolean,
  onRestricted?: (code: RestrictionCode) => void,
) {
  const [selection, setSelection] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [receipt, setReceipt] = useState<VideoSubmissionReceipt | null>(null);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // An upload whose form was rejected; resubmitting reuses it instead of
  // sending the whole file again.
  const uploadedRef = useRef<{ file: File; upload: FinishedUpload } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  // Captured as soon as a file is chosen, so it is ready long before the
  // upload finishes.
  const posterRef = useRef<{
    file: File;
    poster: Promise<string | undefined>;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (selection) URL.revokeObjectURL(selection.url);
    };
  }, [selection]);

  // Leaving mid-upload, or with a rejected upload, frees its parts in R2.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (uploadedRef.current) cancelVideoUpload(uploadedRef.current.upload);
    },
    [],
  );

  function discardUpload() {
    if (uploadedRef.current) cancelVideoUpload(uploadedRef.current.upload);
    uploadedRef.current = null;
  }

  function chooseFile(file?: File) {
    if (!file || submittingRef.current) return;
    if (!file.size || file.size > MAX_VIDEO_BYTES) {
      setFileError(`Choose a non-empty video up to ${MAX_VIDEO_LABEL}.`);
      return;
    }
    if (!isVideoContentType(file.type)) {
      setFileError("Choose an MP4, MOV, or WebM video.");
      return;
    }
    discardUpload();
    posterRef.current = { file, poster: captureVideoPoster(file) };
    setFileError(null);
    setError(null);
    setSelection({ file, url: URL.createObjectURL(file) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!selection) {
      setFileError("Choose a video to continue.");
      fileInputRef.current?.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    submittingRef.current = true;
    setError(null);
    try {
      // Check the form before spending minutes on the upload.
      const metadata = submissionMetadata(form, isAdmin);
      let upload =
        uploadedRef.current?.file === selection.file
          ? uploadedRef.current.upload
          : null;
      if (!upload) {
        setPhase("uploading");
        setProgress(0);
        const controller = new AbortController();
        abortRef.current = controller;
        upload = await uploadVideoToStorage(selection.file, "video", {
          signal: controller.signal,
          onProgress: setProgress,
        });
        uploadedRef.current = { file: selection.file, upload };
      }
      setPhase("saving");
      const poster =
        posterRef.current?.file === selection.file
          ? await posterRef.current.poster
          : undefined;
      try {
        const result = await sendVideoSubmission(upload, metadata, poster);
        uploadedRef.current = null;
        setReceipt(result);
        window.dispatchEvent(new Event("eizoki:videos-changed"));
      } catch (cause) {
        if (!uploadSurvives(cause)) uploadedRef.current = null;
        throw cause;
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      const restriction = restrictionOf(cause);
      if (restriction && onRestricted) {
        // Nothing to retry: the parts are discarded and the notice explains why.
        discardUpload();
        onRestricted(restriction);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Your video could not be submitted. Please try again.",
      );
    } finally {
      abortRef.current = null;
      submittingRef.current = false;
      setPhase("idle");
    }
  }

  return {
    selection,
    fileError,
    error,
    isSubmitting: phase !== "idle",
    phase,
    progress,
    receipt,
    fileInputRef,
    chooseFile,
    submit,
  };
}
