/**
 * Shared download budget for feed videos.
 *
 * Without it, every card near the viewport starts downloading at once and
 * they all share the connection, so each first frame arrives late. With it, at
 * most MAX_CONCURRENT_LOADS videos are fetching their first frame at a time;
 * the rest wait their turn, closest to the top of the screen first. Posters
 * cover the wait, so the grid never looks empty.
 *
 * A slot is held only until the video can show its first frame (or fails, or
 * a timeout passes); after that the video keeps playing and buffering on its
 * own and the next card gets the slot.
 */

const MAX_CONCURRENT_LOADS = 3;

/** A stalled request must not block the queue behind it. */
const SLOT_TIMEOUT_MS = 8_000;

type Ticket = {
  /** Lower goes first; read at grant time so it follows scrolling. */
  rank: () => number;
  grant: () => void;
};

const waiting = new Set<Ticket>();
let active = 0;
let scheduled = false;

/**
 * Hand out slots on the next task, not immediately: every card that scrolls
 * in during one frame asks separately, and they must all be in line before
 * ranking decides who goes first.
 */
function schedulePump() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    pump();
  }, 0);
}

function pump() {
  while (active < MAX_CONCURRENT_LOADS && waiting.size > 0) {
    let next: Ticket | undefined;
    let nextRank = Infinity;
    for (const ticket of waiting) {
      const rank = ticket.rank();
      if (!next || rank < nextRank) {
        next = ticket;
        nextRank = rank;
      }
    }
    if (!next) return;
    waiting.delete(next);
    active += 1;
    next.grant();
  }
}

export type LoadSlot = {
  /** Still in line, not yet allowed to load. */
  readonly waiting: boolean;
  /** Give the slot back (loaded, failed, or no longer needed). Idempotent. */
  release: () => void;
};

export function requestLoadSlot(
  rank: () => number,
  onGrant: () => void,
): LoadSlot {
  let state: "waiting" | "active" | "done" = "waiting";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ticket: Ticket = {
    rank,
    grant: () => {
      state = "active";
      timer = setTimeout(release, SLOT_TIMEOUT_MS);
      onGrant();
    },
  };

  function release() {
    if (state === "waiting") waiting.delete(ticket);
    if (state === "active") {
      active -= 1;
      clearTimeout(timer);
    }
    state = "done";
    schedulePump();
  }

  waiting.add(ticket);
  schedulePump();
  return {
    get waiting() {
      return state === "waiting";
    },
    release,
  };
}
