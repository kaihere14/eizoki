/** The shared submission catalog. Existing videos retain their original tags. */
export const VIDEO_TAGS = [
  { value: "cinematic", label: "Cinematic" },
  { value: "monochrome", label: "Monochrome" },
  { value: "glitch", label: "Glitch" },
  { value: "generative", label: "Generative" },
  { value: "analog", label: "Analog" },
  { value: "pastel", label: "Pastel" },
  { value: "space", label: "Space" },
  { value: "portrait", label: "Portrait" },
  { value: "film-look", label: "Film look" },
  { value: "audio-reactive", label: "Audio reactive" },
  { value: "product-launch", label: "Product launch" },
  { value: "ui-concept", label: "UI concept" },
  { value: "simulation", label: "Simulation" },
  { value: "kinetic-type", label: "Kinetic type" },
  { value: "material-study", label: "Material study" },
] as const;

export type VideoTag = (typeof VIDEO_TAGS)[number]["value"];
export const VIDEO_TAG_VALUES = VIDEO_TAGS.map((tag) => tag.value) as [
  VideoTag,
  ...VideoTag[],
];
export const MAX_VIDEO_TAGS = 3;

export function isVideoTag(value: unknown): value is VideoTag {
  return (
    typeof value === "string" && VIDEO_TAG_VALUES.includes(value as VideoTag)
  );
}
