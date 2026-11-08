"use client";

import { useState, type RefObject } from "react";
import { ArrowUpFromLine, Film, RefreshCw } from "lucide-react";

type VideoUploadProps = {
  selection: { file: File; url: string } | null;
  inputRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  disabled: boolean;
  onChoose: (file?: File) => void;
};

export function VideoUpload({
  selection,
  inputRef,
  error,
  disabled,
  onChoose,
}: VideoUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  function choose(file?: File) {
    setPreviewError(false);
    onChoose(file);
  }

  return (
    <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
      <input
        ref={inputRef}
        id="submission-video"
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        aria-label="Upload video"
        aria-describedby="submission-video-help submission-video-error"
        aria-invalid={Boolean(error)}
        tabIndex={-1}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) choose(event.dataTransfer.files[0]);
        }}
        className={`relative flex min-h-[230px] items-center justify-center overflow-hidden rounded-[22px] border bg-white/80 transition-[border-color,background-color] duration-150 sm:min-h-[300px] lg:min-h-[410px] ${dragging ? "border-brand bg-brand-50" : selection ? "border-zinc-200/80" : "border-dashed border-zinc-300"}`}
      >
        {selection ? (
          <video
            key={selection.url}
            src={selection.url}
            controls
            autoPlay
            loop
            muted
            playsInline
            aria-label="Your video preview"
            className="block max-h-[460px] w-full bg-zinc-950 object-contain"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex min-h-[230px] w-full cursor-pointer flex-col items-center justify-center px-5 py-12 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:min-h-[300px] lg:min-h-[410px]"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-zinc-200/80 bg-white text-zinc-500 shadow-[0_2px_4px_rgba(9,9,11,0.04)]">
              <Film className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="font-display text-[19px] font-medium tracking-tight text-zinc-800">
              Drop your video here
            </span>
            <span className="mt-2 text-[13px] text-zinc-500">
              or <span className="text-brand">choose a file</span>
            </span>
            <span
              id="submission-video-help"
              className="mt-6 text-[11.5px] text-zinc-500"
            >
              MP4, MOV or WebM · Up to 100 MB
            </span>
          </button>
        )}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-50/95 text-[14px] font-medium text-brand">
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Drop to replace video
          </div>
        )}
      </div>
      {selection && (
        <div className="mt-3 flex items-center gap-3 px-1">
          <Film className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.7} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-zinc-700">
              {selection.file.name}
            </p>
            <p
              id="submission-video-help"
              className="mt-0.5 text-[11px] text-zinc-500"
            >
              {(selection.file.size / 1_000_000).toFixed(1)} MB
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-zinc-600 outline-none transition-colors hover:bg-white hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" /> Replace
          </button>
        </div>
      )}
      {previewError && (
        <p className="mt-3 px-1 text-[12px] leading-relaxed text-zinc-500">
          This browser can’t preview the file. You can still submit it.
        </p>
      )}
      <p
        id="submission-video-error"
        role={error ? "alert" : undefined}
        className="mt-3 px-1 text-[12px] text-red-600"
      >
        {error}
      </p>
    </div>
  );
}
