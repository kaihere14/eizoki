import Link from "next/link";
import { LiveExamples, Prose } from "@/components/blog";

export default function AiProductLaunchVideoGuide() {
  return (
    <Prose>
      <p>
        A product launch video has one job: make someone understand what you
        built and want to try it, before they scroll away. AI video tools make
        it possible for a small team to produce launch films that used to need
        a studio, but they do not replace the structure that makes a launch
        video work. This guide covers that structure, the pacing, and where AI
        helps and where it does not.
      </p>

      <h2>What a launch video has to do</h2>
      <ul>
        <li>
          <strong>Stop the scroll</strong> in the first two or three seconds.
        </li>
        <li>
          <strong>Show the product early.</strong> Viewers should see the real
          thing, not only atmosphere.
        </li>
        <li>
          <strong>Make one promise</strong> and support it with two or three
          moments, not a feature list.
        </li>
        <li>
          <strong>End on one action</strong>: the name, the URL, and what to do
          next.
        </li>
      </ul>

      <h2>A structure that works</h2>
      <p>
        Most strong launch films, whatever their length, move through the same
        beats. For a video of around 30 to 45 seconds:
      </p>
      <ol>
        <li>
          <strong>Hook (first 2–3 seconds).</strong> A striking visual or a
          sharp line about the problem. This is where an AI-generated shot
          often earns its place.
        </li>
        <li>
          <strong>Promise.</strong> One sentence on screen or in voice-over:
          what changes for the viewer.
        </li>
        <li>
          <strong>Reveal.</strong> The product itself: real interface, real
          device, real packaging.
        </li>
        <li>
          <strong>Two or three moments.</strong> Each feature gets one shot and
          one idea. Cut before it outstays its welcome.
        </li>
        <li>
          <strong>End card.</strong> Logo, name, URL and call to action, held
          long enough to read.
        </li>
      </ol>

      <LiveExamples category="launch-videos" heading="Launch videos from the collection" />

      <h2>Where AI video tools help</h2>
      <ul>
        <li>
          <strong>Hooks and openers</strong>: an impossible camera move, a
          material transformation, a surreal image that makes people stop.
        </li>
        <li>
          <strong>Feature metaphors</strong>: &ldquo;fast&rdquo; or
          &ldquo;secure&rdquo; shown as motion rather than a bullet point.
        </li>
        <li>
          <strong>Transitions</strong> between the product and the world
          around it.
        </li>
        <li>
          <strong>Variations</strong>: alternate openers and formats for
          different platforms without reshooting.
        </li>
      </ul>

      <h2>Where to keep it real</h2>
      <ul>
        <li>
          <strong>Your interface.</strong> Use real screen captures or real UI
          rebuilt in a motion tool, then frame them with AI shots. A generated
          interface rarely matches your product, and viewers notice. The{" "}
          <Link href="/ui-motion">UI motion</Link> collection shows how others
          animate real screens.
        </li>
        <li>
          <strong>Logos and type.</strong> Set them in your editor. Generated
          text is still unreliable.
        </li>
        <li>
          <strong>Claims.</strong> Anything you state about the product should
          be true of the product people will download.
        </li>
      </ul>

      <h2>Pacing and format</h2>
      <ul>
        <li>
          Keep most shots short, roughly one to three seconds, and let the
          product reveal breathe a little longer.
        </li>
        <li>
          Cut to the music. A track with clear accents does half the pacing
          work for you.
        </li>
        <li>
          Plan your aspect ratios before you generate: 16:9 for websites and
          YouTube, 1:1 or 4:5 for feeds, 9:16 for vertical video. Generating
          in the right ratio beats cropping later.
        </li>
        <li>
          Assume many people watch without sound. Put the promise on screen.
        </li>
      </ul>

      <h2>A simple production checklist</h2>
      <ol>
        <li>Write the one-sentence promise and the end-card action.</li>
        <li>List the beats and the shot for each, with its length.</li>
        <li>Collect references, ideally from launch films you admire.</li>
        <li>
          Generate the AI shots, using one consistent style block in every
          prompt. Our{" "}
          <Link href="/blog/how-to-write-ai-video-prompts-for-motion-design">
            prompt guide
          </Link>{" "}
          explains how.
        </li>
        <li>Capture the real product footage.</li>
        <li>Edit to music, add type and the end card, then export per platform.</li>
      </ol>
      <p>
        When you find a launch video on Eizoki whose structure fits yours, the{" "}
        <strong>Copy prompt</strong> button gives you its prompt as a template
        together with the reference video, ready to adapt to your own product.
        Browse all <Link href="/launch-videos">product launch videos</Link> to
        find one.
      </p>
    </Prose>
  );
}
