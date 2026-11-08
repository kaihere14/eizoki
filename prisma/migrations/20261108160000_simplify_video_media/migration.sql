-- DropIndex
DROP INDEX "videos_reviewStatus_mediaStatus_publishedAt_id_idx";

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "height",
DROP COLUMN "mediaStatus",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "width";

-- DropEnum
DROP TYPE "video_media_status";

-- CreateIndex
CREATE INDEX "videos_reviewStatus_publishedAt_id_idx" ON "videos"("reviewStatus", "publishedAt", "id");

