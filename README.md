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

| Discipline | Focus Area |
| :--- | :--- |
| **AI Motion Design** | Exceptional AI-generated animations, kinetic flow, and high-fidelity motion graphics. |
| **Launch Videos** | Product reveals, feature drops, SaaS launch promos, and brand motion. |
| **3D & Experiments** | Abstract 3D scenes, procedural visuals, neural simulations, and experimental spatial art. |
| **UI Motion** | Interface transitions, spatial UI, dynamic HUDs, and interactive concept motion. |
| **Kinetic Typography** | Typography-driven animation, generative type, and rhythmic text motion. |
| **Cinematic & Visual Stories** | Short narrative sequences, worldbuilding, atmospheric shots, and artistic storytelling. |
| **Creative Experiments** | Unconventional, boundary-pushing work that defies standard classification. |

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
- **Fast, Reliable Video Previews:** Muted hover-previews / scrubbable previews optimized for smooth frame delivery.
- **Dedicated Video Detail Modals / Pages:** Deep-dive into creator credits, toolchains used (e.g., Sora, Runway Gen-3, Kling, Luma Dream Machine, Midjourney, ComfyUI), and prompt data.
- **Copyable Prompts & Parameters:** Clean UI for copying prompts with one click.
- **Style & Workflow Tagging:** Filter by aesthetic, pacing, aspect ratio, camera technique, and underlying model.
- **Personal Collections / Bookmarking:** (Roadmap) Save and organize creative references.

---

## ✦ Design Direction & References

- **Vibrant Design:** Editorial presentation, typography hierarchy, and effortless content discovery.
- **Designerr.xyz:** Polished dark visual canvas, clean cards, and curated aesthetic tone.
- **Imagery:** Visual-first masonry browsing, fluid layout transitions, and seamless prompt discovery.

*Note: References serve as inspiration for standard of excellence, not templates to reproduce. Eizoki develops its own custom design tokens and interaction vocabulary.*

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
