-- CreateEnum
CREATE TYPE "video_review_status" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "video_media_status" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "video_prompt_status" AS ENUM ('ORIGINAL', 'RECONSTRUCTED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "creatorUsername" TEXT,
    "creatorXUrl" TEXT,
    "creatorProfileUrl" TEXT,
    "sourceUrl" TEXT,
    "videoUrl" TEXT NOT NULL,
    "imagekitFileId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "mediaStatus" "video_media_status" NOT NULL DEFAULT 'PROCESSING',
    "promptStatus" "video_prompt_status" NOT NULL DEFAULT 'UNAVAILABLE',
    "promptText" TEXT,
    "negativePrompt" TEXT,
    "toolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curatorNotes" TEXT,
    "reviewStatus" "video_review_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_slug_key" ON "videos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "videos_imagekitFileId_key" ON "videos"("imagekitFileId");

-- CreateIndex
CREATE INDEX "videos_reviewStatus_createdAt_id_idx" ON "videos"("reviewStatus", "createdAt", "id");

-- CreateIndex
CREATE INDEX "videos_reviewStatus_mediaStatus_publishedAt_id_idx" ON "videos"("reviewStatus", "mediaStatus", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "videos_submittedById_createdAt_id_idx" ON "videos"("submittedById", "createdAt", "id");

-- CreateIndex
CREATE INDEX "videos_reviewedById_idx" ON "videos"("reviewedById");

-- CreateIndex
CREATE INDEX "videos_category_publishedAt_id_idx" ON "videos"("category", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "videos_tags_idx" ON "videos" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

