# Eizoki — Premium AI Motion & Video Inspiration Library

> **A hand-curated visual discovery platform showcasing exceptional AI-generated videos, motion design, and creative experiments from creators across the internet.**

[![Status](https://img.shields.io/badge/status-active%20development-blue)](#)
[![Category](https://img.shields.io/badge/category-Creative%20Inspiration-purple)](#)
[![Focus](https://img.shields.io/badge/curation-editorial%20first-black)](#)

---

## ✦ Overview

**Eizoki** is a premium, hand-curated visual discovery platform dedicated to showcasing exceptional AI-generated videos, motion graphics, creative experiments, and product launch videos from creators worldwide.

Inspired by curated design platforms like **Vibrant Design**, **Designerr.xyz**, and **Imagery**, Eizoki brings that same elevated editorial quality of visual discovery to the emerging frontier of AI-generated motion and video.

> **Crucial Distinction:** Eizoki does not generate videos and does not compete with AI video-generation tools. Its sole purpose is to discover, curate, organize, and beautifully present exceptional creative work produced by human creators using AI workflows.

---

## ✦ Vision

To become the defining destination for discovering exceptional AI-generated motion and video work:

- A place people visit knowing that **every video discovered will be worth watching**.
- Prioritizing **editorial quality over content quantity**. Every piece must earn its place.
- **50 exceptional videos are more valuable than 5,000 mediocre ones.**

---

## ✦ Content Categories

Eizoki organizes work across distinct, evolving creative disciplines:

| Discipline                     | Focus Area                                                                                |
| :----------------------------- | :---------------------------------------------------------------------------------------- |
| **AI Motion Design**           | Exceptional AI-generated animations, kinetic flow, and high-fidelity motion graphics.     |
| **Launch Videos**              | Product reveals, feature drops, SaaS launch promos, and brand motion.                     |
| **3D & Experiments**           | Abstract 3D scenes, procedural visuals, neural simulations, and experimental spatial art. |
| **UI Motion**                  | Interface transitions, spatial UI, dynamic HUDs, and interactive concept motion.          |
| **Kinetic Typography**         | Typography-driven animation, generative type, and rhythmic text motion.                   |
| **Cinematic & Visual Stories** | Short narrative sequences, worldbuilding, atmospheric shots, and artistic storytelling.   |
| **Creative Experiments**       | Unconventional, boundary-pushing work that defies standard classification.                |

---

## ✦ Core Product Principles

1. **Quality-First Curation**  
   Strict editorial filters. Avoid cluttering the platform with generic, low-effort, or repetitive AI generations just to inflate entry counts.

2. **Premium Visual Experience**  
   Immersive, refined, dark-mode-first aesthetic with seamless video playback, zero layout thrash, and generous negative space where the art shines.

3. **Discovery-Oriented Flow**  
   Exploration driven by visual masonry grids, curated collections, model/tool tags, dynamic categories, and fluid micro-interactions.

4. **Creator Attribution**  
   Every entry honors the creator, linking directly to original profiles, portfolios, and social sources.

5. **Prompt Accessibility & Transparency**  
   When publicly shared, prompts are published alongside video entries, clearly labeled as **Original**, **Reconstructed**, or **Unavailable**.

6. **Living Archive**  
   Continuously tracking the cutting edge of generative video models, novel workflows, and emergent visual styles.

---

## ✦ Product Experience & Features

- **Masonry Discovery Grid:** Fluid, responsive layout respecting diverse video aspect ratios (16:9, 9:16, 1:1, 4:5, 2.39:1).
- **Fast, Reliable Video Previews:** Muted looping videos play while visible and pause when they leave the viewport.
- **Dedicated Video Detail Modals / Pages:** Deep-dive into creator credits, toolchains used (e.g., Sora, Runway Gen-3, Kling, Luma Dream Machine, Midjourney, ComfyUI), and prompt data.
- **Copyable Prompts & Parameters:** Clean UI for copying prompts with one click.
- **Style & Workflow Tagging:** Filter by aesthetic, pacing, aspect ratio, camera technique, and underlying model.
- **Personal Collections / Bookmarking:** Save any public motion to a private, account-backed favourites shelf.

---

## ✦ Design Direction & References

- **Vibrant Design:** Editorial presentation, typography hierarchy, and effortless content discovery.
- **Designerr.xyz:** Polished dark visual canvas, clean cards, and curated aesthetic tone.
- **Imagery:** Visual-first masonry browsing, fluid layout transitions, and seamless prompt discovery.

_Note: References serve as inspiration for standard of excellence, not templates to reproduce. Eizoki develops its own custom design tokens and interaction vocabulary._

---

## ✦ Development & Architecture

Refer to [agent/agent.md](file:///Applications/Coding/Serious/eizoki/agent/agent.md) for technical design, data schemas, design tokens, coding standards, and agent operational rules.

## Authentication

Clerk manages sessions behind Eizoki's custom popup. There are no prebuilt sign-in,
sign-up, or user-menu components. Email uses a verification code for both new and
returning users; Google and X use redirect-based OAuth. `/sign-in` opens the same
popup, `/sign-in/continue` collects missing OAuth signup information, and
`/sso-callback` handles the provider callback. Clerk's callback handler may display
a required bot challenge.

### Local setup

Run `bun install`. Link the Eizoki Clerk application with `clerk link --app <app-id>`
and run `clerk env pull` to write development keys to the ignored `.env.local`.
Alternatively, copy `.env.example` and fill in your keys locally. Keep the secret key
server-only. Start the app with `bun dev`.

In the Clerk instance, configure:

- Open signup; required email, verification at signup, and email-code sign-in
- Passwords disabled; no required phone number, username, first name, or last name
- Google and X enabled for authentication
- Custom sign-in and signup URLs set to `/sign-in`

The catalogue remains public. Any future private API or Server Action must use
server-side `auth()`/`auth.protect()`; hiding a client control does not protect data.
No organization, password-reset, or MFA-enrollment session tasks are enabled for
this app. If those settings change, implement the matching custom session-task
screens first. Pending sessions are blocked instead of treated as signed in.

### Verification

With the local app running and development keys configured:

```sh
bunx playwright install chromium
bun run test:auth
bun run lint
bun run build
```

`PLAYWRIGHT_TEST_BASE_URL` can target another local port. An existing browser can
be selected using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The auth tests refuse
production keys, use Clerk's reserved test emails, and delete their test accounts.
They cover signup, returning-user login, invalid codes, cooldown, session
persistence, sign-out, mobile dismissal, OAuth provider handoffs, and missing-email
continuation. Completing Google/X consent with a real provider account still needs
a manual end-to-end check.

### Production setup

Use a Clerk production instance and configure its domain, allowed origins/redirects,
email delivery and Google/X credentials. Set that instance's live keys in the hosting
provider's environment, retaining the custom auth URLs from `.env.example`. Rebuild
after changing the publishable key. Development credentials and shared OAuth
credentials must not be used for the production launch.

## Database

Prisma ORM 7 connects to Postgres through the `pg` driver adapter. Add the connection
string to `.env.local` (see `.env.example`):

```env
DATABASE_URL="postgresql://user:password@host:5432/eizoki?schema=public"
```

The schema lives in `prisma/schema.prisma`; the generated client is written to
`lib/generated/prisma` and is not committed. `bun install` and `bun run build` both
run `prisma generate`. Apply schema changes with:

```sh
bun run db:migrate   # prisma migrate dev (creates + applies a migration)
bun run db:deploy    # prisma migrate deploy (applies committed migrations)
bun run db:push      # prototype-only, skips migration history
bun run db:studio    # browse data
```

The initial migration lives in `prisma/migrations`, so a hosted database only
needs `bun run db:deploy` once. `prisma generate` does not need `DATABASE_URL`, so
`bun run build` works on CI before the database is connected; `DATABASE_URL` is
still required at runtime and by every `db:*` command.

`User` mirrors a Clerk account: `id` is Eizoki's own `cuid()` primary key, `clerkId`
is the unique Clerk `user_...` id, and `email` is unique. Basic profile fields
(`firstName`, `lastName`, `username`) and timestamps are kept in sync. Instead of an
image URL, `avatar` stores which bundled default illustration the user picked
(`GIRL` or `BOY`, defaulting to `BOY`).

The browser loads that row once per session through `components/user-provider.tsx`,
which calls `GET /api/users/me` whenever Clerk reports a signed-in session. A `401`
from that route means the Clerk cookies are missing or stale, so the UI falls back to
signed-out state instead of retrying.

API routes:

- `GET /api/health` — returns `200` when Postgres answers, `503` otherwise.
- `GET /api/users/me` — requires a Clerk session; upserts the user from their Clerk
  profile and returns the database record.
- `PATCH /api/users/me` — requires a Clerk session; accepts `{ "avatar": "GIRL" | "BOY" }`
  and returns the updated record.
- `GET /api/videos` — public catalogue. Returns only `APPROVED` videos whose
  `publishedAt` is set and not in the future. Supports `category`, `limit` (1–48,
  default 24), and the opaque `cursor` from the previous page.
- `GET /api/favourites` — requires a Clerk session and returns the signed-in
  user's saved public videos plus `favouritedAt`, newest save first.
- `GET /api/videos/[id]/favourite` — reports `{ "favourited": boolean }` for the
  signed-in user; signed-out visitors get `false`.
- `PUT /api/videos/[id]/favourite` / `DELETE` — idempotently save or remove the
  unique bookmark for the signed-in user.

### Video submission foundation

`User.isAdmin` defaults to `false`, including for existing users. Grant admin access
explicitly through a trusted database operation using the intended account's
unique `clerkId`. Clerk profile synchronization and the self-service profile API
do not write this field. Never accept it from a submission request.

`Video` is the shared catalog and submission record. `submittedById` identifies
the Eizoki account that submitted it; `creatorName`, optional `creatorUsername`,
`creatorXUrl`, and `creatorProfileUrl` credit the actual creator, who need not have
an account. `sourceUrl` can identify the original post.

Store the original `videoUrl` plus the file's storage handle: `storageKey` (the
Cloudflare R2 object key) for new uploads, or `imagekitFileId` for videos uploaded
before the move to R2. A database check constraint requires exactly one of them.
Feed previews use the video itself; no thumbnail, width, or height is stored.
Duration is optional; the browser reads it from the file's metadata.
Keep `promptText` verbatim and append a stable video reference
URL based on the record's immutable `id` when copying a prompt.
`GET /api/videos/[id]/reference` redirects to the stored asset only when the
record is approved and published. Missing or non-public references return `404`.
The redirect is not cached, so later approval changes are checked on each request.

Only confirmed, verified uploads become video records, so no media readiness field
is needed. Review status is `PENDING_REVIEW`, `APPROVED`, or `REJECTED`. The
submission service reads the submitter's `isAdmin` from the database: admin submissions are
approved immediately, while others retain the database default `PENDING_REVIEW`.
Public queries must require `APPROVED` and a non-null `publishedAt` no later than
the current time. Review actions must
also authorize the current user on the server and record the reviewer and time.
The submission API implements the admin/community approval distinction. The
database-backed public feed is implemented; the admin review panel remains a
separate implementation step.

The initial video migration adds the admin column and videos table without
rewriting profile fields. A later migration removes thumbnail/dimension fields
and media status, replacing the public-feed index. Deploy the simplified service
before that removal when releases overlap: it also works against the older schema.
To return to the old service afterward, first restore those columns, the media
status enum/default, and the old index in a new migration. Upload URLs, prompts,
creator details, review history, and admin assignments are retained.

### Submit a video

Videos upload straight from the browser to Cloudflare R2 with S3 multipart
uploads. The bytes never pass through a Vercel function, so its 4.5 MB request
body limit does not apply; the server only handles small JSON calls. The limit
is 500 MB (`lib/video-upload-limits.ts`).

1. `POST /api/uploads` with `{ "purpose": "video" | "sponsor", "size", "contentType" }`.
   The server creates the multipart upload under a key that embeds the caller's
   user ID (`videos/<userId>/<uuid>.<ext>`) and returns one presigned `PUT` URL per
   10 MiB part, valid for one hour.
2. The browser `PUT`s each slice of the file to its URL, four at a time, retrying
   network and 5xx failures with backoff, and collects each part's `ETag`.
3. `POST /api/videos` with JSON `{ "metadata": {...}, "upload": { "key",
   "uploadId", "parts": [{ "partNumber", "etag" }], "durationSeconds"? },
   "poster"? }`. `poster` is a base64 still frame the browser captured from the
   chosen file (see [Feed loading](#feed-loading)).
   The server validates the metadata first, so a rejected form leaves the parts in
   R2 and the browser resubmits without re-uploading. It then checks the key
   belongs to the caller, completes the upload (R2 joins the parts), checks the
   stored size, type, and file signature, and only then saves the record. Invalid
   files are deleted.

`POST /api/uploads/abort` with `{ "key", "uploadId" }` discards an unfinished
upload; the form calls it when a file is replaced or the dialog closes mid-upload.

#### R2 setup

Set these server-only variables (`.env.local` for development, the Vercel project
for production): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`, and `R2_PUBLIC_URL`. Create the access key as an R2 API token
with Object Read & Write on the bucket only. `R2_PUBLIC_URL` is the bucket's
public base URL. Use a custom domain in production: the `r2.dev` URL is
rate-limited and never cached by Cloudflare, so every view of every video goes
back to the bucket.

Public URLs are built from each object's key and `R2_PUBLIC_URL` when a row is
read, so switching domains needs no data migration: change the variable and
redeploy.

Connecting a custom domain (the domain's DNS must be on Cloudflare):

1. R2 → the bucket → Settings → Custom Domains → Connect Domain, and enter a
   subdomain such as `media.your-domain.com`. Cloudflare creates the DNS record.
2. Add a Cache Rule (the zone → Caching → Cache Rules) for
   `Hostname equals media.your-domain.com`: Eligible for cache, Edge TTL "Use
   cache-control header if present". By default Cloudflare caches `.mp4`,
   `.webm` and `.webp` by extension but not `.mov`; the rule covers every
   upload. Objects are stored with `Cache-Control: public, max-age=31536000,
   immutable`, and keys are never reused, so long caching is safe.
3. No CORS change is needed: CORS only matters for uploads, which still go to
   the S3 API endpoint, and plain `<video>` and `<img>` playback is not CORS.
4. Set `R2_PUBLIC_URL=https://media.your-domain.com` and redeploy. Check a video
   response in DevTools: the second request should show `cf-cache-status: HIT`.

The browser uploads cross-origin, so the bucket needs a CORS policy that allows
`PUT` from the site and exposes `ETag` (without it every upload fails with
"Storage did not confirm the upload"). In the R2 dashboard, Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Also add an object lifecycle rule that aborts incomplete multipart uploads after
one day, so parts from abandoned uploads do not accumulate storage.

ImageKit (`IMAGEKIT_PRIVATE_KEY`) is still used for sponsor icons and to delete
videos uploaded before the move to R2.

#### Feed loading

Videos are served as uploaded, with no server-side transcoding, so the feed
keeps the first impression cheap in three ways:

- **Poster frames.** When a file is chosen, the browser draws one frame (a
  quarter of the way in, at most one second) onto a canvas and sends it as a
  720px WebP with the submission. The server re-encodes it with sharp, stores
  it next to the video (`<video key>.poster.webp`) and records the video's
  aspect ratio, so cards have their real shape and an image within one small
  request. A frame the browser cannot decode (for example HEVC in some
  browsers) only means that video has no poster.
- **A load queue** (`components/video-load-queue.ts`). At most three videos
  fetch their first frame at a time, those highest on screen first; each slot
  frees once the video can show a frame. Visible videos still autoplay.
- **Unloading.** Videos more than 1600px off screen release their buffers and
  fall back to their poster.

Videos uploaded before posters existed get one with
`bun run posters:backfill` (needs `ffmpeg`; `--dry-run` lists them first,
`--limit 5` tries a few). It reads only the bytes around the frame over HTTP.

#### Metadata

The required fields are `title`, `category` (an existing category slug), and
`creatorName`. Other creator details can describe someone other than the submitter.

Example metadata:

```json
{
  "title": "Chromatic Drift",
  "category": "ai-motion-design",
  "creatorName": "Original Creator",
  "creatorUsername": "creator",
  "creatorXUrl": "https://x.com/creator",
  "promptStatus": "ORIGINAL",
  "promptText": "Slow cinematic dolly through an iridescent liquid prism.",
  "tags": ["cinematic", "film-look"],
  "toolsUsed": ["Runway"]
}
```

Additional optional metadata: `description`, `creatorProfileUrl`, `sourceUrl`,
and `negativePrompt`. Links must use HTTPS. `promptStatus` defaults to
`UNAVAILABLE`; choose `ORIGINAL` or `RECONSTRUCTED` and provide `promptText` when
sharing a prompt. Admins may also set `curatorNotes` and `isFeatured`.

Tags are optional: choose up to three distinct values from the shared fixed
catalog in `lib/video-tags.ts`. The form displays selected tags as removable
pills and keeps a dashed Add tag button after them. The API rejects unknown
tags, duplicates, and selections larger than three before completing the upload.

The route only handles HTTP responses. Services separately authorize/provision
the submitter, validate the request, finish and verify the R2 upload, and
construct and save the Prisma record. Admin submissions are approved and published;
community submissions remain `PENDING_REVIEW` with no publication date. Pending
records stay out of the public catalog; the underlying R2 object URL is public
if known.

A `201` response contains `{ "video": { "id", "slug", "title", "reviewStatus",
"publishedAt", "createdAt" } }`. Errors contain `{ "error": "..." }`:
`400` invalid metadata/body or missing parts, `401` signed out, `403` admin-only
fields or someone else's upload, `409` already submitted, `410` upload expired or
cancelled, `413` oversized video, `415` unsupported or disguised file, `422`
missing account email, `502` R2 failure, `503` missing R2 configuration, or `500`
persistence failure. Failed saves delete the stored video; failed cleanup logs the
key for reconciliation. A retried request whose first attempt already saved the
video returns `409` and never deletes it.

Run `bun run test:unit` for isolated controller/service tests with mocked Clerk,
R2, and Prisma. They do not upload assets or modify the real database.

### Public feed

`GET /api/videos` returns `{ "videos": [...], "nextCursor": "..." | null }`.
The response mirrors `VideoMetadata`: creator credit, prompt provenance, tags,
tools, duration, and the original `videoUrl`. Visibility is enforced in
the query, so pending and future-dated records never reach the browser.

`components/video-feed.tsx` fetches the first page on mount, shows
`SkeletonFeed` until it arrives, and keeps a shimmer on each card until the
browser has decoded the video’s first frame. Cards lazy-load when they approach
the viewport, loop muted while visible, pause outside the viewport or in a hidden
tab, and paginate with `nextCursor`. Opening the detail modal pauses the feed;
closing it resumes visible cards. The detail
modal renders the same video with controls and derives its aspect ratio from the
video’s intrinsic dimensions. An approved submission dispatches
`eizoki:videos-changed`, which refetches the feed.

Clicking outside the video frame and details sidebar closes the preview without
navigating or losing the feed's scroll position. The creator credit is currently
non-clickable, reserved for a future Eizoki profile. The supplied X username is
shown on the separate Open on X account link. View original appears only for an
explicit source URL distinct from that account link; profiles and source posts
are never substituted for one another in the feed response.

Loaded and failed media stop the loading shimmer. Copy prompt preserves the
original prompt and appends “Please use this video as the reference:” followed
by the absolute website reference URL. Copy prompt is always the pink primary
button, including when no prompt was shared; in that case it copies only the
reference sentence and URL. View original stays secondary and appears only when
an original-post link exists. The reference link is always shown in the prompt
section. Run `bunx playwright test tests/e2e/video-playback.spec.ts` to verify
real playback, viewport pausing/resuming, shimmer removal, and copied references
with a small local WebM fixture and mocked feed data.

### My Videos and deletion

The navbar shows My Videos followed by Favourites; Info is hidden from navigation.
`/my-videos` asks signed-out visitors to sign in. Signed-in users see only records
they submitted, including pending, approved, and rejected videos, with status,
upload date, preview, and a delete action. Crediting someone else as creator does
not change submission ownership. The list refreshes after every successful upload.

`GET /api/videos/mine?limit=24&cursor=...` requires authentication and returns
`{ videos, nextCursor }`, with the existing video fields plus `reviewStatus` and
`createdAt`. Results are ordered by creation time and ID, include all review states,
and use `private, no-store`. The server derives `submittedById` from the Clerk
session and database account; callers cannot select another user's uploads.

`DELETE /api/videos/[id]` requires the same submitter, including for admin callers.
The UI asks for confirmation before sending it. Missing or someone else's records
return `404` without contacting storage. The service deletes the file first (from
R2, or from ImageKit for older videos) and removes the ownership-scoped database
record only after confirmation. A storage failure returns `502` and retains the
record for retry. If the file was removed but the database delete fails, the
response explains that deletion should be retried; deleting an already-missing
file succeeds on that retry. A completed deletion returns `204` and refreshes the
affected list.

Run `bunx playwright test tests/e2e/my-videos.spec.ts` for the private-management UI
checks. They use temporary Clerk accounts and mocked data/deletion endpoints;
no real upload records or stored files are deleted.

### Favourites

`Favourite` stores a private bookmark as a unique `(userId, videoId)` pair, so one
account can save a video at most once. Deleting either the user or the video
cascades to the bookmark. The user-scoped `(userId, createdAt, id)` index keeps
each shelf keyset-paginated by save time rather than publication time.

The preview reads the current state through
`GET /api/videos/[id]/favourite` and writes with an idempotent `PUT`/`DELETE`.
Signed-out visitors are shown the login modal instead. `/favourites` asks them to
sign in; signed-in users get a masonry shelf with save dates, paging, and a
heart control on each card. A toggle dispatches `eizoki:favourites-changed`, so
the shelf drops a video immediately when it is removed from its preview.

Only `APPROVED`, published videos can be saved, and the list repeats that filter,
so a later rejection removes the entry from every shelf without deleting the
bookmark row. Apply the favourites table migration with `bun run db:deploy`
before using the feature against an existing database.

### Submission overlay

The navbar's Submit button opens the existing login modal for signed-out visitors
or an in-place submission dialog for signed-in users. The navbar stays visible,
the page keeps its scroll position, and no navigation occurs. The form requires
only a video, title, category, and creator name; X attribution, up to three fixed
tags, and the prompt are optional, with source/process information under More details. Admin options are
shown only for database admins; authorization is still enforced by the API.

Uploads use `POST /api/videos`. Errors preserve the selected file and form values;
successful submissions show either publication or pending-review confirmation.
The dialog supports keyboard focus containment, Escape, reduced motion, mobile
layouts, local looping video previews, and the current blue/pink theme.

With the dev server running, run `bunx playwright test tests/e2e/submission.spec.ts`
for the submission UI checks. These use a temporary Clerk development account
(deleted afterward) and mock the user-profile and video APIs, so no real video
assets or database entries are created.

## Themes

The palette lives in `app/theme.css` as CSS variables, and `app/globals.css` maps
them to Tailwind tokens (`bg-brand`, `text-brand`, `border-brand`, `bg-brand-50`,
`hover:bg-brand-600`, `text-on-brand`, `var(--brand-shadow)`, …). Two independent
switches on `<html>` pick the palette:

- `data-theme="blue" | "pink"` picks the brand accent.
- `data-mode="light" | "dark"` picks the neutral canvas.

That gives four brand palettes in `theme.css`: light blue, light pink, dark blue
and dark pink. Dark blue is the default: the root layout server-renders
`data-mode="dark" data-theme="blue"` on `<html>`. Dark mode also re-points
Tailwind's `white`, `zinc-*` and status tints (red, amber, emerald) at dark values,
so existing utilities flip without per-component `dark:` classes. Use
`text-on-brand` (not `text-white`) for text on a brand or red fill, and the
`--raised-*` variables for the raised control gradients. A `dark:` variant that
follows the in-app switch is available for one-off tweaks.

Signed-in users switch the colour theme and Light/Dark appearance from the avatar
menu, just below Choose avatar. The choices are saved in `localStorage`
(`eizoki:theme`, `eizoki:mode`) and applied by a boot script in the root layout
before first paint, so pages stay static and there is no colour flash.
