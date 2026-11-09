import { describe, expect, test } from "bun:test";

/** Slots are handed out on the next task, after a frame's requests are in. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
import { requestLoadSlot } from "@/components/video-load-queue";

describe("video load queue", () => {
  test("lets three videos load at once and hands slots on in rank order", async () => {
    const granted: string[] = [];
    const slots = new Map<string, ReturnType<typeof requestLoadSlot>>();
    const ranks: Record<string, number> = { a: 0, b: 100, c: 200, d: 900, e: 300 };
    for (const name of ["a", "b", "c", "d", "e"]) {
      slots.set(
        name,
        requestLoadSlot(() => ranks[name], () => granted.push(name)),
      );
    }
    expect(granted).toEqual([]);
    await tick();
    // Requested in one go, they are served by rank, not arrival.
    expect(granted).toEqual(["a", "b", "c"]);
    expect(slots.get("d")?.waiting).toBe(true);

    // `e` is closer to the top of the screen than `d`, so it goes first.
    slots.get("a")?.release();
    await tick();
    expect(granted).toEqual(["a", "b", "c", "e"]);

    // Releasing twice must not free a second slot.
    slots.get("a")?.release();
    await tick();
    expect(granted).toHaveLength(4);

    // A card scrolled past before its turn leaves the line without loading.
    slots.get("d")?.release();
    slots.get("b")?.release();
    await tick();
    expect(granted).toEqual(["a", "b", "c", "e"]);

    for (const slot of slots.values()) slot.release();
  });

  test("reads rank when a slot frees, so scrolling reorders the line", async () => {
    const granted: string[] = [];
    const blockers = [0, 1, 2].map(() => requestLoadSlot(() => 0, () => {}));
    await tick();
    let lowerRank = 500;
    const upper = requestLoadSlot(() => 100, () => granted.push("upper"));
    const lower = requestLoadSlot(() => lowerRank, () => granted.push("lower"));
    lowerRank = 0; // the user scrolled down; this card is now at the top
    blockers[0].release();
    await tick();
    expect(granted).toEqual(["lower"]);
    for (const slot of [...blockers, upper, lower]) slot.release();
  });
});
