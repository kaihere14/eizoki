export function videoReferencePath(id: string) {
  return `/api/videos/${encodeURIComponent(id)}/reference`;
}

/**
 * Builds the text the copy button puts on the clipboard. Prompts are written
 * for the creator's own project, so the text frames the prompt as a template
 * and tells the model to ask which project the video is for when that is not
 * clear. The original prompt is never edited.
 */
export function promptWithVideoReference(
  prompt: string | undefined,
  id: string,
  origin: string,
) {
  const referenceUrl = new URL(videoReferencePath(id), origin).href;
  const hasPrompt = Boolean(prompt?.trim());
  const sections = [
    hasPrompt
      ? "Use the prompt and reference video below as a template for style, pacing, structure and motion. They were made for a different project."
      : "Use the reference video below as a template for style, pacing, structure and motion. It was made for a different project.",
    "Before you start, check whether I have told you which project this video is for. If I haven't, ask me whether to make it for my own project (and ask for its details) or to keep the template's original project as it is.",
    "When it is for my project, replace every project-specific detail (product name, logo, taglines, on-screen copy, features, brand colors, URLs, people) with details from my project. Do not carry over anything that belongs to the original project.",
  ];
  if (hasPrompt) sections.push(`--- Template prompt ---\n${prompt}`);
  sections.push(`--- Reference video ---\n${referenceUrl}`);
  return sections.join("\n\n");
}
