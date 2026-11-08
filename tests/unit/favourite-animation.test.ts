import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { animateFavouriteSave } from "@/lib/favourite-animation";

const previous = new Map<string, PropertyDescriptor | undefined>();
const animation = () => ({ cancel: mock(() => {}), onfinish: null as (() => void) | null });
let reduced = false;
let visibleTarget = true;
let cardPulse: ReturnType<typeof animation>;
let flight: ReturnType<typeof animation>;
let arrival: ReturnType<typeof animation>;
let append: ReturnType<typeof mock>;
let remove: ReturnType<typeof mock>;
let targetAnimate: ReturnType<typeof mock>;
let card: HTMLElement;

beforeEach(() => {
  reduced = false;
  visibleTarget = true;
  cardPulse = animation();
  flight = animation();
  arrival = animation();
  append = mock(() => {});
  remove = mock(() => {});
  targetAnimate = mock(() => arrival);
  const target = {
    isConnected: true,
    getBoundingClientRect: () => ({ left: 300, top: 20, bottom: 50, width: visibleTarget ? 90 : 0, height: 30 }),
    animate: targetAnimate,
  };
  const globals = {
    window: { matchMedia: () => ({ matches: reduced }) },
    innerHeight: 900,
    document: {
      querySelector: () => target,
      body: { append },
      createElement: () => ({ style: {}, setAttribute() {}, remove, animate: () => flight }),
    },
  };
  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  card = {
    getBoundingClientRect: () => ({ left: 100, top: 200, bottom: 500, width: 200, height: 300 }),
    querySelector: () => null,
    animate: () => cardPulse,
  } as unknown as HTMLElement;
});

afterEach(() => {
  for (const [name, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  previous.clear();
});

test("reduced motion creates no flying layer or animation", () => {
  reduced = true;
  animateFavouriteSave(card)();
  expect(append).not.toHaveBeenCalled();
  expect(cardPulse.cancel).not.toHaveBeenCalled();
});

test("hidden navigation uses only local confirmation", () => {
  visibleTarget = false;
  const cancel = animateFavouriteSave(card);
  expect(append).not.toHaveBeenCalled();
  cancel();
  expect(cardPulse.cancel).toHaveBeenCalledTimes(1);
});

test("arrival removes the floating card before pulsing favourites", () => {
  animateFavouriteSave(card);
  expect(append).toHaveBeenCalledTimes(1);
  expect(targetAnimate).not.toHaveBeenCalled();
  flight.onfinish?.();
  expect(remove).toHaveBeenCalledTimes(1);
  expect(targetAnimate).toHaveBeenCalledTimes(1);
});

test("unmount or replacement cancels motion and removes the floating card", () => {
  const cancel = animateFavouriteSave(card);
  cancel();
  expect(flight.cancel).toHaveBeenCalledTimes(1);
  expect(cardPulse.cancel).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
});
