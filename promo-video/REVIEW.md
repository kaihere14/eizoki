# Review — pass 1

Checked with `hyperframes check` (passes) and `snapshot --review` (beats, five seams, phone width).

Fixed during review:
- Fanned stack overlapped the words around it: tightened the fan, widened the gap to the words.
- Logo in the cabin window held only 0.25 s: cabin scene lengthened to 2.0 s, logo now holds ~0.8 s before the push.
- Blank frames at the orbit → streams seam: orbit fling shortened; first stream cards start already in flight.
- Streams were sparse and small: 30 larger cards per phrase, tighter lanes.
- Golden card crossed "Launch videos" on its way in, and stream cards drew over it: it now comes from the bottom right, lands right of the text, and sits above the field.
- URL on the end card held under 2 s: brought in earlier.
- Motion blur shutter lowered from 240 to 160 so the fly-throughs smear without turning to mush.

Open:
- No music or sound (template-style promos usually carry a bed). Offered to the person.
- `duplicate_media_discovery_risk` warning: the hook's front card and the cabin both use window-view.jpg at the same start — intentional (it is the match cut).

BANNED additions for this film: none new.

# Review — pass 2

- Every stock card in the hook, orbit and streams is now a real poster from eizoki.xyz (34 posters). Cards are 16:9 landscape to match the posters. Cabin scene untouched (file identical to pass 1).
- Stream cards briefly drew over the growing golden card under render-time blur; the streams now dissolve as it takes over (from 2.16 s in the scene).
- Two `duplicate_media_discovery_risk` warnings: posters reused across scenes, and window-view.jpg at the hook→cabin match cut. Intentional.

# Review — pass 3

- Golden-hour landscape replaced with the real eizoki UI (Discover / Save / Prompt). Streams shortened 2.6 → 2.3 s, end card 2.9 → 2.7 s; film stays 15 s.
- Cursor tip moved off the heart so the fill reads.
- End card lockup lands earlier so wordmark and URL each hold 2 s (line_unread cleared).
- SFX added on separate lanes. Music still to come.

# Review — pass 4

- Product section slowed from 3.6 s to 6.0 s (film now 17.4 s). Cursor and camera are one pure function of time: the cursor glides between stops on eased, slightly bowed paths; the camera follows it 0.12 s behind (0.25 s let the cursor reach the window edge mid-push).
- Modal open fade shortened to 0.2 s to avoid a long double exposure.
- SFX clicks and the end chime moved to the new action times.

# Review — pass 5

- Heart click: the cursor tip sat on the button's lower-right edge (+9, +10 px from centre). Moved to the heart's centre (+1, +2). Copy click moved to the button's vertical centre.
- Verified every click: at each click time the cursor tip, computed from the scene's own motion functions, lies inside the target's on-screen box (heart, card, Copy prompt), and crops of the rendered frames confirm it. Each state change fires 0.05-0.06 s after the cursor arrives.
- Music bed added (HeyGen), aligned to the track's break.

# Review — pass 6 (opening v2)

- v1 opening saved at versions/hook-v1-plain-opening.html; history entry 686bd11f pinned (whole project before this change).
- Line 1 "Still searching for": 44 px Regular with wide word gaps → 120 px Geist Medium, -3.5% tracking, natural word spacing; each word lands from an 18 px blue blur at 114% scale and settles to ink.
- Line 2: 92 px; the card is 400 x 225 (16:9 poster) with 44 px gaps, positions measured for the font; the words slide out from behind the card; the fan is wider and the words ease apart to make room.
- Line 1 now clears before the card arrives (they overlapped at 1.3 s).
