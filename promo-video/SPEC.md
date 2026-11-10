# eizoki — 15 s brand promo

GOAL:    The viewer leaves knowing eizoki is the place to find hand-picked AI video and motion work worth watching, and remembers the mark.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    17.4 s x 30 = 522 frames.
LOOK:    Ground #ffffff. Ink #09090b. Accent eizoki blue #3074fe (brand-500), used only for: the blur the first words arrive in, card outlines in the orbit, the "AI motion" label.
         The logo is the brand's own file (public/eizoki.webp), never redrawn. Wordmark "eizoki" lowercase, Geist Medium, -3% tracking (as in the navbar).
         Copy: Geist Regular 44 px, -1% tracking; end wordmark 112 px.
         Medium: real photographs on rounded cards (radius 22 px, 6 px white mat, shadow 0 18 40 rgba(9,9,11,.18)).
         One photographic world: a vintage wood-panelled compartment with a snow peak in the window. Real eizoki posters and real eizoki UI everywhere else.
OBJECTS: Photo cards (portrait 3:3.9). Compartment window with two panes and a centre mullion; the peak slides past behind the glass (the train moves).
MOTION:  Arrivals expo.out / power4.out; camera power2.inOut; exits and fly-throughs power3.in. Words blur in 14 px -> 0 in 0.2 s, 0.12 s apart.
         Card flip rotateY 0 -> 90 in 0.18 s power2.in, stack opens -90 -> 0 in 0.35 s back.out(1.4).
         Render-time motion blur on (data-motion-blur) for the fly-throughs.
SHOTS:
  1  0.00-2.60  hook (white)   "Still searching for" words blur in from blue; then "AI video [card] worth watching?" — card flips into a fanned stack of 6. Hand-off: the top card (the peak) grows past the frame.
  2  2.60-4.40  cabin          Starts inside the window (peak fills frame), pulls back to the compartment; logo then "eizoki" land centred in the window. Hand-off: push into the window, blur out.
  3  4.40-6.30  orbit (white)  "Hand-picks [card] the best" with outlined cards orbiting; blue "AI motion" label pops below. Hand-off: orbit speeds up, cards fling off-frame.
  4  6.40-8.70 streams        "Motion design", then "Launch videos": streams of real eizoki posters fly through on 3D diagonals. Hand-off: one card (the real feed) flies in and grows into the product window.
  5  8.70-14.70 product       The real eizoki site in a window on white. "Discover it." — the feed flicks down and settles at the top. "Save it." — cursor hovers a card, camera pushes to its heart, click, heart fills with the product's own burst. "Prompt it." — click opens the video preview, camera pushes to Copy prompt, click, "Prompt copied". Cursor glides on eased, slightly bowed paths; the camera tracks it 0.12 s behind.
  6  14.70-17.40 endcard      Logo lands, wordmark wipes in beside it, "eizoki.xyz" below. Hold 2 s.
SOUND:   Bundled SFX on the visible actions (pops, whooshes, clicks, end chime). Music bed: HeyGen catalogue track, 0.6 gain, trimmed 0.2 s so its break sits on "Prompt copied" (13.8 s) and the beat returns with the logo (14.8 s); 0.5 s fade in, 1.4 s fade out.
BANNED:  dark void ground, glow/bloom/neon, purple-blue mesh gradients, glass cards, mono caps labels, logo in a corner, titles drifting after they land, everything fading up, claims eizoki does not make (no "millions", no AI generation — eizoki curates, it does not generate).
QA:      0.3 s blue blur on "Still"; 2.2 s fanned stack; 3.6 s logo centred in window; 5.4 s orbit + label; 7.0 s and 8.3 s streams with blur; 10.5 s landscape + line; 14.5 s end card.
