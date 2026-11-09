import { prisma } from "@/lib/prisma";

export async function findPublicVideoReference(id: string) {
  return prisma.video.findFirst({
    where: {
      id,
      reviewStatus: "APPROVED",
      publishedAt: { not: null, lte: new Date() },
    },
    select: { videoUrl: true, storageKey: true },
  });
}
