# Eizoki default avatars

Created with the built-in ChatGPT image generation tool from the two user-supplied portrait references. The active files are `male-transparent.png` and `female-transparent.png`, with genuine alpha transparency around the ink and in the face/neck negative space. Earlier opaque generations remain as source artwork. Next.js serves optimized versions at the displayed size.

The male portrait is the fallback for users without an explicit avatar preference. The account menu lets users select either illustration. The choice is stored in Postgres as `users.avatar` (`BOY` or `GIRL`, defaulting to `BOY`) through `PATCH /api/users/me`; it is a cosmetic preference, not an identity or authorization field.

## Prompts

### Transparent cutouts (final assets)

Edit target: the supplied male avatar. Remove its entire pale pink/lilac/white background and make it genuinely transparent using the PNG alpha channel. Preserve the same black hair silhouette, black facial features, exact linework, neck, pose, proportions and square framing. All pale canvas, face and neck negative space should be transparent too, leaving ONLY the dark ink illustration with smooth antialiased alpha edges. No white rectangle, no pink rectangle, no colored backdrop, no shadow or halo, no baked checkerboard. This is a transparent black-ink avatar cutout for placement directly on a white web interface. Do not redesign the character.

Edit target: the supplied female avatar. Remove its entire pale pink/lilac/white background and make it genuinely transparent using the PNG alpha channel. Preserve the same black hair silhouette, black facial features, exact linework, neck, pose, proportions and square framing. All pale canvas, face and neck negative space should be transparent too, leaving ONLY the dark ink illustration with smooth antialiased alpha edges. No white rectangle, no pink rectangle, no colored backdrop, no shadow or halo, no baked checkerboard. This is a transparent black-ink avatar cutout for placement directly on a white web interface. Do not redesign the character.

### Male

Use case: identity-preserve. Edit target: the attached male avatar reference. Produce one high-quality square 1024x1024 production avatar, a faithful clean redraw of this exact male character with swept voluminous black hair, a visible ear, slim neck and gentle smile. Preserve the reference's friendly minimalist black editorial line illustration, three-quarter face facing right, facial proportions and hair silhouette. Sharp smooth antialiased ink lines, solid near-black hair and eyes, pale pink-lilac background #f8f0f8 filling the complete square edge to edge; face and neck the same pale background tone. Center the complete head and neck, with comfortable even margins, matching a companion portrait in the same set. Preserve flat 2D illustration, no realism, no 3D, no shading or textures. Remove stray black fragments cropped along the left and bottom corners. No circular container, no rounded corners baked in, no frame, no text, no watermark. The image must read clearly as a tiny 28px rounded-square avatar.

### Female

Use case: identity-preserve. Edit target: the attached female avatar reference. Produce one high-quality square 1024x1024 production avatar, a faithful clean redraw of this exact female character with shoulder-length side-parted black hair framing the face and a gentle smile. Preserve the reference's friendly minimalist black editorial line illustration, three-quarter face facing right, facial proportions and hair silhouette. Sharp smooth antialiased ink lines, solid near-black hair and eyes, pale pink-lilac background #f8f0f8 filling the complete square edge to edge; face and neck the same pale background tone. Center the complete head and neck, with comfortable even margins, matching a companion portrait in the same set. Preserve flat 2D illustration, no realism, no 3D, no shading or textures. Remove stray black fragments cropped along the left and bottom corners. No circular container, no rounded corners baked in, no frame, no text, no watermark. The image must read clearly as a tiny 28px rounded-square avatar.
