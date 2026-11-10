import Link from "next/link";
import { LiveExamples, Prose } from "@/components/blog";

export default function WhatIsAiMotionDesign() {
  return (
    <Prose>
      <p>
        <strong>AI motion design</strong> is motion graphics made with
        generative video tools. Instead of building every frame with keyframes,
        a designer describes or sketches what they want, a model generates or
        animates the frames, and the designer selects, directs and edits the
        result. The craft moves from animating each element to directing a
        system: choosing the idea, the look, the camera and the pacing, then
        deciding which of many generations is worth keeping.
      </p>
      <p>
        It covers abstract loops, logo and title sequences, transitions,
        product visuals, music visuals and short brand films. This guide
        explains how it is made, where it works, where it still falls short,
        and how to learn from the best examples.
      </p>

      <h2>How AI motion design differs from traditional motion design</h2>
      <p>
        In traditional motion design you control everything and pay for it in
        time: every curve, every layer, every frame is placed by hand. In AI
        motion design you trade some of that control for speed and range. A
        single prompt can produce lighting, materials and camera movement that
        would take days to build, but you cannot always nudge one element two
        pixels to the left.
      </p>
      <ul>
        <li>
          <strong>Direction over construction.</strong> The main skill is
          describing a shot precisely and recognising a good take.
        </li>
        <li>
          <strong>Iteration is cheap.</strong> Ten variations of a shot cost
          minutes, so exploration happens early and widely.
        </li>
        <li>
          <strong>Finishing is still manual.</strong> Most polished pieces are
          edited, retimed, colour-graded and given type and sound in
          conventional tools.
        </li>
      </ul>

      <h2>How creators make it</h2>
      <p>
        Workflows vary, but most of the AI motion work we feature follows a
        similar path:
      </p>
      <ol>
        <li>
          <strong>Concept and references.</strong> A mood, a palette, a few
          reference frames or a rough storyboard.
        </li>
        <li>
          <strong>Key frames.</strong> Many creators generate or design still
          images first, because a still locks the style before any motion is
          added.
        </li>
        <li>
          <strong>Animation.</strong> The stills are animated with an
          image-to-video model, or shots are generated directly from text,
          one camera move at a time.
        </li>
        <li>
          <strong>Selection.</strong> Each shot is generated several times and
          the best take is kept. Selection is where taste shows.
        </li>
        <li>
          <strong>Edit and finish.</strong> Shots are cut to music, retimed,
          graded, and combined with type, logos and real product footage.
        </li>
      </ol>
      <p>
        If you want to write the prompts for step three, our guide to{" "}
        <Link href="/blog/how-to-write-ai-video-prompts-for-motion-design">
          writing AI video prompts for motion design
        </Link>{" "}
        breaks a prompt into the parts that matter.
      </p>

      <LiveExamples category="ai-motion-design" heading="AI motion design from the collection" />

      <h2>Where AI motion design works well</h2>
      <ul>
        <li>
          <strong>Abstract loops and backgrounds</strong> for stages, websites
          and title cards, where exact content matters less than mood.
        </li>
        <li>
          <strong>Transitions and morphs</strong> between scenes or objects,
          which are slow to animate by hand.
        </li>
        <li>
          <strong>Product mood films</strong> that show a feeling or a
          material rather than a specific screen.
        </li>
        <li>
          <strong>Concepts and pitches</strong>, where showing a direction in
          motion beats describing it.
        </li>
        <li>
          <strong>Social content</strong> that needs many variations quickly.
        </li>
      </ul>

      <h2>Where it still struggles</h2>
      <ul>
        <li>
          <strong>Text.</strong> Legible, correctly spelled type is still
          unreliable. Most creators add type afterwards; see the{" "}
          <Link href="/kinetic-typography">kinetic typography</Link> collection
          for how they combine the two.
        </li>
        <li>
          <strong>Exact brand assets.</strong> Logos, specific products and
          real interfaces are usually composited in rather than generated.
        </li>
        <li>
          <strong>Consistency across shots.</strong> Keeping a character,
          object or style identical from shot to shot takes reference images
          and repeated style descriptions.
        </li>
        <li>
          <strong>Precise timing.</strong> Hitting an exact beat or duration
          usually happens in the edit, not in the generation.
        </li>
      </ul>

      <h2>How to learn from examples</h2>
      <p>
        Watching good work closely is the fastest way to improve. When you
        study a piece, ask:
      </p>
      <ul>
        <li>What is the single camera move in each shot?</li>
        <li>How long does each shot last before the cut?</li>
        <li>What stays consistent across shots: palette, light, material?</li>
        <li>Which parts look generated and which look finished by hand?</li>
      </ul>
      <p>
        Every video on Eizoki credits its creator and links to the original.
        Where the creator shared their prompt, it is marked{" "}
        <strong>Original</strong>; prompts we rebuilt from the creator&apos;s
        notes are marked <strong>Reconstructed</strong>; and{" "}
        <strong>Not shared</strong> means there is no prompt to show. Reading
        an original prompt next to the video it produced is one of the best
        ways to learn what a model responds to.
      </p>
      <p>
        Start with the <Link href="/ai-motion-design">AI motion design</Link>{" "}
        collection, then explore{" "}
        <Link href="/creative-experiments">creative experiments</Link> for
        techniques that have not become common yet.
      </p>
    </Prose>
  );
}
