import Link from "next/link";
import { LiveExamples, PromptExample, Prose } from "@/components/blog";

export default function HowToWriteAiVideoPrompts() {
  return (
    <Prose>
      <p>
        A good AI video prompt reads like a shot description from a director,
        not a list of keywords. It says what is in the frame, how it moves, how
        the camera moves, what the light and materials look like, and how fast
        it all happens. This guide gives you a structure that works across AI
        video tools, a few example prompts, and a method for adapting a prompt
        you found to your own project.
      </p>

      <h2>One prompt, one shot</h2>
      <p>
        The most common mistake is asking for a whole video in one prompt.
        Models generate shots, and each shot handles one idea well: one
        subject, one action, one camera move. If you need a sequence, write a
        prompt per shot and cut them together in an editor. Short, specific
        shots are easier to regenerate when one of them misses.
      </p>

      <h2>The six parts of a motion design prompt</h2>
      <ol>
        <li>
          <strong>Subject.</strong> What is in frame. Be concrete: &ldquo;a
          translucent glass sphere&rdquo; beats &ldquo;a cool object&rdquo;.
        </li>
        <li>
          <strong>Motion.</strong> What the subject does. Use verbs with speed
          and direction: &ldquo;slowly unfolds outward&rdquo;, &ldquo;ripples
          from the centre&rdquo;.
        </li>
        <li>
          <strong>Camera.</strong> One move, named plainly: slow dolly in,
          orbit left, static locked-off shot, top-down, macro close-up.
        </li>
        <li>
          <strong>Light and environment.</strong> Where the light comes from
          and what surrounds the subject: soft studio light from above,
          dark seamless background, volumetric haze.
        </li>
        <li>
          <strong>Style and material.</strong> The surface and finish:
          brushed aluminium, frosted glass, matte clay, film grain, a specific
          palette.
        </li>
        <li>
          <strong>Pacing.</strong> Slow and calm, or snappy. Mention seamless
          looping if you need a loop.
        </li>
      </ol>
      <p>
        Some tools also accept a <strong>negative prompt</strong>: a list of
        things to avoid, such as text, watermarks, extra objects or camera
        shake. When a creator shared one, Eizoki shows it under the prompt.
      </p>

      <h2>Example prompts</h2>
      <p>
        These are written to show the structure. Adjust the wording to the
        tool you use, since each model responds to phrasing a little
        differently.
      </p>
      <PromptExample label="Abstract loop">
        {`A field of thin chrome ribbons slowly twisting in unison, ripples travelling from left to right. Static camera, slight macro depth of field. Soft studio light from above, deep navy seamless background. Polished metal with subtle iridescence. Calm, slow, seamless loop.`}
      </PromptExample>
      <PromptExample label="Product reveal">
        {`A matte white wireless speaker on a stone plinth, fine dust drifting in the air. Slow dolly in from a wide shot to a close-up of the fabric grille. Warm low sunlight raking from the right, long soft shadows, dark warm background. Photoreal, shallow depth of field. Unhurried, premium pacing.`}
      </PromptExample>
      <PromptExample label="Background for kinetic type">
        {`Soft gradient fog in coral and violet drifting slowly across the frame, gentle grain. Static camera. Empty centre of the frame for text to be added later. Minimal, calm, seamless loop.`}
      </PromptExample>
      <p>
        Notice the last one leaves space for type instead of asking the model
        to write it. Generated text is still unreliable; most creators add it
        in an editor afterwards.
      </p>

      <h2>Lock the look with an image first</h2>
      <p>
        If you care about a precise style, generate or design a still frame
        first and animate it with an image-to-video model. The still fixes the
        composition, palette and materials, so your prompt only has to
        describe the motion and the camera. This is also the most reliable way
        to keep several shots consistent.
      </p>

      <h2>Iterate one variable at a time</h2>
      <ul>
        <li>
          Keep a <strong>style block</strong>, the light, material and palette
          sentences, identical across every shot in a piece.
        </li>
        <li>
          When a take misses, change only one part: the camera move, or the
          speed, or the subject&apos;s action. Otherwise you cannot tell which
          change helped.
        </li>
        <li>
          Generate several takes per prompt. Selection is part of the craft.
        </li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>Several actions or camera moves in one prompt.</li>
        <li>
          Vague adjectives (&ldquo;epic&rdquo;, &ldquo;amazing&rdquo;) instead
          of light, material and motion.
        </li>
        <li>Contradictions, such as a static camera that also orbits.</li>
        <li>Asking the model to render your logo or exact interface.</li>
      </ul>

      <LiveExamples category="ai-motion-design" heading="Study real prompts" />

      <h2>Adapting a prompt you found</h2>
      <p>
        A prompt that produced a great video was written for someone
        else&apos;s project. To reuse it well, separate its
        <strong> structure</strong> (camera, pacing, light, composition) from
        its <strong>specifics</strong> (product, brand colours, names, copy).
        Keep the structure and replace every specific with your own.
      </p>
      <p>
        On Eizoki, the <strong>Copy prompt</strong> button does this framing
        for you: it copies the original prompt as a template together with the
        reference video, and tells the AI to ask which project the video is for
        and to replace every project-specific detail. Prompts labelled{" "}
        <strong>Original</strong> came from the creator;{" "}
        <strong>Reconstructed</strong> prompts were rebuilt from their notes,
        so treat them as a close starting point rather than the exact recipe.
      </p>
      <p>
        Browse prompts by type in{" "}
        <Link href="/ai-motion-design">AI motion design</Link>,{" "}
        <Link href="/cinematic-stories">cinematic AI films</Link> and{" "}
        <Link href="/3d-experiments">3D experiments</Link>, or read{" "}
        <Link href="/blog/what-is-ai-motion-design">
          what AI motion design is
        </Link>{" "}
        for the bigger picture.
      </p>
    </Prose>
  );
}
