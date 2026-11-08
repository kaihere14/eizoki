"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_VIDEO_BYTES } from "@/lib/video-upload-limits";
import {
  sendVideoSubmission,
  submissionMetadata,
  type VideoSubmissionReceipt,
} from "@/lib/video-submission";

export function useVideoSubmission(isAdmin: boolean) {
  const [selection, setSelection] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<VideoSubmissionReceipt | null>(null);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (selection) URL.revokeObjectURL(selection.url);
    };
  }, [selection]);

  function chooseFile(file?: File) {
    if (!file || submittingRef.current) return;
    if (!file.size || file.size > MAX_VIDEO_BYTES) {
      setFileError("Choose a non-empty video smaller than 100 MB.");
      return;
    }
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
      setFileError("Choose an MP4, MOV, or WebM video.");
      return;
    }
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
    setIsSubmitting(true);
    setError(null);
    try {
      const metadata = submissionMetadata(form, isAdmin);
      const result = await sendVideoSubmission(selection.file, metadata);
      setReceipt(result);
      window.dispatchEvent(new Event("eizoki:videos-changed"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your video could not be submitted. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    selection,
    fileError,
    error,
    isSubmitting,
    receipt,
    fileInputRef,
    chooseFile,
    submit,
  };
}
