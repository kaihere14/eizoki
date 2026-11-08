-- Manual moderation switches; both default off for every existing user.
ALTER TABLE "users" ADD COLUMN "uploadBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
