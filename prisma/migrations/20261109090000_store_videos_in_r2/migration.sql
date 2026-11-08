-- New videos are stored in Cloudflare R2; existing ones stay on ImageKit.
ALTER TABLE "videos" ALTER COLUMN "imagekitFileId" DROP NOT NULL;
ALTER TABLE "videos" ADD COLUMN "storageKey" TEXT;
CREATE UNIQUE INDEX "videos_storageKey_key" ON "videos"("storageKey");

-- Every video names exactly one stored file.
ALTER TABLE "videos" ADD CONSTRAINT "videos_one_stored_file"
  CHECK (("imagekitFileId" IS NULL) <> ("storageKey" IS NULL));

ALTER TABLE "sponsorships" ADD COLUMN "videoStorageKey" TEXT;
CREATE UNIQUE INDEX "sponsorships_videoStorageKey_key" ON "sponsorships"("videoStorageKey");
