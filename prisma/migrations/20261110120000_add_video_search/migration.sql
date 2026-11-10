-- Fuzzy search over the public catalogue. pg_trgm matches by shared
-- three-letter fragments, so a misspelt or half-remembered name still finds
-- the video ("kinetc typo" finds "Kinetic Typography").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- One lower-cased document per video. The trigger below owns it: the app never
-- writes it, so every insert path (submissions, admin edits, scripts) stays in
-- step without remembering to.
ALTER TABLE "videos" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

CREATE FUNCTION "videos_search_text"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchText" := lower(concat_ws(' ',
    NEW."title",
    NEW."creatorName",
    NEW."creatorUsername",
    -- Slugs such as "kinetic-typography" read as words.
    replace(NEW."category", '-', ' '),
    replace(array_to_string(NEW."tags", ' '), '-', ' '),
    array_to_string(NEW."toolsUsed", ' '),
    NEW."description",
    NEW."promptText"
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER "videos_search_text"
BEFORE INSERT OR UPDATE OF "title", "creatorName", "creatorUsername", "category", "tags", "toolsUsed", "description", "promptText"
ON "videos"
FOR EACH ROW EXECUTE FUNCTION "videos_search_text"();

-- Fill the document for existing rows; the no-op assignment fires the trigger.
UPDATE "videos" SET "title" = "title";

CREATE INDEX "videos_searchText_idx" ON "videos" USING GIN ("searchText" gin_trgm_ops);
