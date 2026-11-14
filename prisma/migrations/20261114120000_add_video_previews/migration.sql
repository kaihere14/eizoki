-- A small, silent clip per video, played by the feed instead of the original file.
ALTER TABLE "videos" ADD COLUMN "previewKey" TEXT;
CREATE UNIQUE INDEX "videos_previewKey_key" ON "videos"("previewKey");
