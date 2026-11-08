/** Fly a frozen copy into the shelf, keeping the catalogue and keyboard focus stable. */
export function animateFavouriteSave(card: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const target = document.querySelector<HTMLElement>('a[href="/favourites"]');
  const source = card.getBoundingClientRect();
  const destination = target?.getBoundingClientRect();
  if (!source.width || !source.height || source.bottom < 0 || source.top > innerHeight) return () => {};

  const pulse = card.animate([
    { transform: "scale(1)", opacity: 1 },
    { transform: "scale(0.97)", opacity: 0.55, offset: 0.35 },
    { transform: "scale(1)", opacity: 1 },
  ], { duration: 540, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });

  // The navigation link is hidden on narrow screens; use local confirmation there.
  if (!target || !destination?.width || !destination.height || destination.bottom < 0 || destination.top > innerHeight) {
    return () => pulse.cancel();
  }

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed", left: `${source.left}px`, top: `${source.top}px`,
    width: `${source.width}px`, height: `${source.height}px`,
    borderRadius: "12px", overflow: "hidden", pointerEvents: "none",
    zIndex: "1000", background: "#f4f4f5", transformOrigin: "center",
    boxShadow: "0 12px 32px rgb(9 9 11 / 0.2)",
  });
  const video = card.querySelector("video");
  if (video && video.readyState >= 2) {
    const frame = document.createElement("canvas");
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.style.cssText = "width:100%;height:100%;object-fit:cover";
    frame.getContext("2d")?.drawImage(video, 0, 0);
    ghost.append(frame);
  }
  document.body.append(ghost);
  const x = destination.left + destination.width / 2 - source.left - source.width / 2;
  const y = destination.top + destination.height / 2 - source.top - source.height / 2;
  const flight = ghost.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 0.95 },
    { transform: `translate(${x * 0.25}px, ${y * 0.45 - 24}px) scale(0.65) rotate(-4deg)`, opacity: 0.9, offset: 0.4 },
    { transform: `translate(${x}px, ${y}px) scale(0.04) rotate(0deg)`, opacity: 0 },
  ], { duration: 640, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
  let arrival: Animation | undefined;
  flight.onfinish = () => {
    ghost.remove();
    if (target.isConnected) arrival = target.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.09)", color: "var(--brand-500)", offset: 0.4 },
      { transform: "scale(1)" },
    ], { duration: 280, easing: "ease-out" });
  };
  return () => {
    flight.cancel();
    pulse.cancel();
    arrival?.cancel();
    ghost.remove();
  };
}
