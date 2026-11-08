-- CreateEnum
CREATE TYPE "sponsorship_placement" AS ENUM ('NAVBAR', 'FEED_VIDEO');

-- CreateEnum
CREATE TYPE "sponsorship_status" AS ENUM ('PENDING_PAYMENT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" TEXT NOT NULL,
    "placement" "sponsorship_placement" NOT NULL,
    "status" "sponsorship_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "bookedById" TEXT,
    "contactEmail" TEXT,
    "productName" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "iconImagekitFileId" TEXT,
    "videoUrl" TEXT,
    "videoImagekitFileId" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsorships_iconImagekitFileId_key" ON "sponsorships"("iconImagekitFileId");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorships_videoImagekitFileId_key" ON "sponsorships"("videoImagekitFileId");

-- CreateIndex
CREATE INDEX "sponsorships_placement_status_startsAt_endsAt_idx" ON "sponsorships"("placement", "status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "sponsorships_status_createdAt_idx" ON "sponsorships"("status", "createdAt");

-- CreateIndex
CREATE INDEX "sponsorships_bookedById_createdAt_idx" ON "sponsorships"("bookedById", "createdAt");

-- CreateIndex
CREATE INDEX "sponsorships_reviewedById_idx" ON "sponsorships"("reviewedById");

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A booking either has no schedule yet or a well-formed one.
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_schedule_check" CHECK (
    ("startsAt" IS NULL AND "endsAt" IS NULL)
    OR ("startsAt" IS NOT NULL AND "endsAt" IS NOT NULL AND "endsAt" > "startsAt")
);

-- Approval always sets a schedule, so the public query never sees an undated sponsor.
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_approved_schedule_check" CHECK (
    "status" <> 'APPROVED' OR "startsAt" IS NOT NULL
);

-- Feed placements carry their own video.
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_feed_video_check" CHECK (
    "placement" <> 'FEED_VIDEO' OR "videoUrl" IS NOT NULL
);

-- Seed the existing navbar sponsor, previously hardcoded in the navbar, for one month.
INSERT INTO "sponsorships" (
    "id", "placement", "status", "productName", "websiteUrl", "iconUrl",
    "startsAt", "endsAt", "reviewedAt", "updatedAt"
) VALUES (
    'sponsorship_daemondoc', 'NAVBAR', 'APPROVED', 'DaemonDoc',
    'https://daemondoc.online', '/DaemonDoc.webp',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
