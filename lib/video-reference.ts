export function videoReferencePath(id: string) {
  return `/api/videos/${encodeURIComponent(id)}/reference`;
}

export function promptWithVideoReference(
  prompt: string | undefined,
  id: string,
  origin: string,
) {
  const referenceUrl = new URL(videoReferencePath(id), origin).href;
  const prefix = prompt?.trim() ? `${prompt}\n\n` : "";
  return `${prefix}Please use this video as the reference:\n${referenceUrl}`;
}
