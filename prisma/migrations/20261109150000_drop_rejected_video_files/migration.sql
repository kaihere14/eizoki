-- A rejected video's file is deleted, so its URL and storage handle go too.
ALTER TABLE "videos" ALTER COLUMN "videoUrl" DROP NOT NULL;

ALTER TABLE "videos" DROP CONSTRAINT "videos_one_stored_file";
ALTER TABLE "videos" ADD CONSTRAINT "videos_stored_file" CHECK (
  CASE
    WHEN "videoUrl" IS NULL THEN
      "imagekitFileId" IS NULL AND "storageKey" IS NULL AND "reviewStatus" = 'REJECTED'
    ELSE
      ("imagekitFileId" IS NULL) <> ("storageKey" IS NULL)
  END
);
