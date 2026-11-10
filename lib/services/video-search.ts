import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MIN_SEARCH_LENGTH } from "@/lib/video-search";
import { toVideoMetadata, VIDEO_FEED_SELECT } from "./video-feed";

const MAX_RESULTS = 24;

/**
 * How closely the query must match some run of words in a video's search
 * document (0–1). Low enough that one or two typos in a word still match,
 * high enough that unrelated words drop out.
 */
const WORD_SIMILARITY_THRESHOLD = 0.35;

export const videoSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(MIN_SEARCH_LENGTH)
    .max(100)
    .transform((value) => value.replace(/\s+/g, " ").toLowerCase()),
  limit: z.coerce.number().int().min(1).max(MAX_RESULTS).default(12),
});

export type VideoSearchQuery = z.infer<typeof videoSearchQuerySchema>;

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Ranks public videos against a half-remembered query. Matching runs on the
 * trigger-maintained `searchText` document (see the add_video_search
 * migration): an exact substring always matches, and the trigram operator
 * `<%` catches misspellings. Ranking prefers titles, then creators, then
 * everything else (tags, tools, description, prompt).
 */
export async function searchPublicVideos({ q, limit }: VideoSearchQuery) {
  const contains = `%${escapeLike(q)}%`;
  const startsWith = `${escapeLike(q)}%`;

  const [, matches] = await prisma.$transaction([
    // `<%` reads its cut-off from this setting; LOCAL keeps it to this query.
    prisma.$executeRawUnsafe(
      `SET LOCAL pg_trgm.word_similarity_threshold = ${WORD_SIMILARITY_THRESHOLD}`,
    ),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "videos"
      WHERE "reviewStatus" = 'APPROVED'
        AND "publishedAt" <= now()
        AND ("searchText" LIKE ${contains} OR ${q} <% "searchText")
      ORDER BY
        (lower("title") LIKE ${startsWith}) DESC,
        GREATEST(
          word_similarity(${q}, lower("title")),
          word_similarity(${q}, lower("creatorName")) * 0.9,
          word_similarity(${q}, lower(coalesce("creatorUsername", ''))) * 0.9,
          word_similarity(${q}, "searchText") * 0.75
        ) DESC,
        "publishedAt" DESC,
        "id" DESC
      LIMIT ${limit}
    `,
  ]);

  if (matches.length === 0) return { videos: [] };

  const rows = await prisma.video.findMany({
    where: { id: { in: matches.map((match) => match.id) } },
    select: VIDEO_FEED_SELECT,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    videos: matches.flatMap((match) => {
      const row = byId.get(match.id);
      return row ? [toVideoMetadata(row)] : [];
    }),
  };
}
