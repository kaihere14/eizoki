# Claude Instructions — Eizoki (映像器)

> **Core Instruction:** All agent behavior, architecture rules, editorial curation principles, TypeScript schemas, design tokens, and implementation phases are defined in [`agent.md`](file:///Applications/Coding/Serious/eizoki/agent/agent.md) located in this folder. Always use `agent.md` as the primary source of truth.

---

## Directives for Claude

1. **Refer to [`agent.md`](file:///Applications/Coding/Serious/eizoki/agent/agent.md):**
   - Before scaffolding code, editing components, or proposing schemas, review [`agent/agent.md`](file:///Applications/Coding/Serious/eizoki/agent/agent.md).
   - Follow all guidelines set in [`../README.md`](file:///Applications/Coding/Serious/eizoki/README.md) and [`agent/agent.md`](file:///Applications/Coding/Serious/eizoki/agent/agent.md).

2. **Core Invariants:**
   - **Curator, not a generator:** Never build video generation tools or generation endpoints. Eizoki is a curation and discovery platform for human-created AI motion work.
   - **Editorial standard:** *50 exceptional videos > 5,000 mediocre ones*. Quality over volume.
   - **Attribution & Transparency:** Every video item must have creator attribution (`creatorName`, `creatorUrl`, `sourceUrl`) and prompt status (`original`, `reconstructed`, `unavailable`).
   - **Performance:** Fixed aspect-ratio containers (zero CLS) and 60fps interaction smoothness with muted, snappy video previews.

3. **Design Aesthetic:**
   - Dark, editorial atmosphere inspired by *Vibrant Design*, *Designerr.xyz*, and *Imagery*.
   - Obsidian/zinc surfaces (`#08080A`, `#0D0E12`, `#14151B`), ultra-fine border highlights, and clean typography with generous whitespace.

4. **Data Models & Roadmap:**
   - See [`agent.md`](file:///Applications/Coding/Serious/eizoki/agent/agent.md) for full TypeScript interfaces (`VideoMetadata`, `CreatorProfile`, `PromptStatus`, `VideoCategory`) and the 4-phase rollout plan.
