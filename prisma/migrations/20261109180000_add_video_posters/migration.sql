-- A still frame per video, shown in the feed before the video itself loads.
ALTER TABLE "videos" ADD COLUMN "posterKey" TEXT;
ALTER TABLE "videos" ADD COLUMN "aspectRatio" DOUBLE PRECISION;
CREATE UNIQUE INDEX "videos_posterKey_key" ON "videos"("posterKey");
