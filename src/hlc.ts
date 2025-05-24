import {
  DEFAULT_CREATE_NODE_ID,
  DEFAULT_MAX_DRIFT,
  DEFAULT_WALL_CLOCK_TIME,
  LOGICAL_CLOCK_LENGTH,
  MAX_EPOCH,
  MAX_LOGICAL_CLOCK,
} from "./defaults.ts";
import {
  throwClockDriftOverflow,
  throwLogicalCounterOverflow,
} from "./erreur.ts";
import type { HLCInstance, HLCInstanceOptions, HLCTimestamp } from "./types.ts";

export const MIN_HLC_TIMESTAMP: HLCTimestamp = createHLCTimestamp(
  0,
  0,
  `00000000-0000-0000-0000-000000000000`
);

export const MAX_HLC_TIMESTAMP: HLCTimestamp = createHLCTimestamp(
  MAX_EPOCH,
  MAX_LOGICAL_CLOCK,
  `ffffffff-ffff-ffff-ffff-ffffffffffff`
);

/**
 * Creates a new Hybrid Logical Clock instance.
 *
 * @returns An HLCInstance object with methods to interact with the clock.
 */
export function createHLC(options: HLCInstanceOptions = {}): HLCInstance {
  const {
    nodeId = DEFAULT_CREATE_NODE_ID(),
    getWallClockTime = DEFAULT_WALL_CLOCK_TIME,
    maxDrift = DEFAULT_MAX_DRIFT,
  } = options;
  // Internal state for the HLC instance, captured by closure.
  // Initialize with current physical time. This ensures state is set to a valid current HLC time.
  let state: HLCTimestamp = createHLCTimestamp(getWallClockTime(), 0, nodeId);

  return {
    nodeId,
    send,
    receive,
    MIN_TIMESTAMP: createHLCTimestamp(0, 0, nodeId),
    MAX_TIMESTAMP: createHLCTimestamp(MAX_EPOCH, MAX_LOGICAL_CLOCK, nodeId),
  };

  function send(): HLCTimestamp {
    const tsNow = getWallClockTime();
    if (tsNow > state.ts) {
      return (state = createSafeHLCTimestamp(tsNow, tsNow, 0));
    }
    return (state = createSafeHLCTimestamp(tsNow, state.ts, state.cl + 1));
  }

  function receive(remoteTimestamp: HLCTimestamp): HLCTimestamp {
    const tsNow = getWallClockTime();
    const ptLocalLast = state.ts;
    const lLocalLast = state.cl;
    const ptRemote = remoteTimestamp.ts;
    const lRemote = remoteTimestamp.cl;

    const newPt = Math.max(tsNow, ptLocalLast, ptRemote);

    if (newPt === ptLocalLast && newPt === ptRemote) {
      return (state = createSafeHLCTimestamp(
        tsNow,
        newPt,
        Math.max(lLocalLast, lRemote) + 1
      ));
    }
    if (newPt === ptLocalLast) {
      return (state = createSafeHLCTimestamp(tsNow, newPt, lLocalLast + 1));
    }
    if (newPt === ptRemote) {
      return (state = createSafeHLCTimestamp(tsNow, newPt, lRemote + 1));
    }
    return (state = createSafeHLCTimestamp(tsNow, newPt, 0));
  }

  /**
   * Create a new HLCTimestamp and check for drift and counter overflow.
   */
  function createSafeHLCTimestamp(
    tsNow: number,
    ts: number,
    cl: number
  ): HLCTimestamp {
    // Check for drift
    const drift = Math.abs(tsNow - ts);
    if (drift > maxDrift) {
      return throwClockDriftOverflow(maxDrift, drift);
    }
    // Check for counter overflow
    if (cl >= MAX_LOGICAL_CLOCK) {
      return throwLogicalCounterOverflow(MAX_LOGICAL_CLOCK, cl);
    }

    return createHLCTimestamp(ts, cl, nodeId);
  }
}

/**
 * Compares two HLC timestamps.
 *
 * @param t1 - The first HLCTimestamp to compare.
 * @param t2 - The second HLCTimestamp to compare.
 * @returns -1 if t1 < t2, 0 if t1 === t2, 1 if t1 > t2.
 */
export function compareHLCTimestamps(
  t1: HLCTimestamp,
  t2: HLCTimestamp
): number {
  if (t1.ts < t2.ts) return -1;
  if (t1.ts > t2.ts) return 1;
  if (t1.cl < t2.cl) return -1;
  if (t1.cl > t2.cl) return 1;
  return 0;
}

/**
 * Parses a string representation of a Hybrid Logical Clock timestamp.
 *
 * The string must be in the format: ISO8601|logicalCounter|nodeId
 * Example: "2025-05-22T12:34:56.789Z|00000001|node-2"
 *
 * @param hlcString - The string to parse.
 * @returns The parsed HLCTimestamp object, or null if invalid.
 */
export function parseHLCTimestamp(hlcString: string): HLCTimestamp | null {
  if (typeof hlcString !== "string") return null;
  const parts = hlcString.split("|");
  if (parts.length !== 3) return null;
  const [dateStr, clStr, id] = parts;
  if (!id || typeof id !== "string" || id.length < 1) return null;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts) || ts < 0 || ts > MAX_EPOCH) return null;
  const cl = parseInt(clStr, 10);
  if (isNaN(cl) || cl < 0 || cl > MAX_LOGICAL_CLOCK) return null;
  return createHLCTimestamp(ts, cl, id);
}

/**
 * Serializes a Hybrid Logical Clock timestamp to its string representation.
 *
 * The output format is: ISO8601|logicalCounter|nodeId
 * Example: "2025-05-22T12:34:56.789Z|00000001|node-2"
 *
 * @param hlc - The HLCTimestamp to serialize.
 * @returns The string representation of the timestamp.
 */
export function serializeHLC(hlc: HLCTimestamp): string {
  return hlc.toString();
}

// ---- INTERNAL

function createHLCTimestamp(ts: number, cl: number, id: string): HLCTimestamp {
  let strCache: string | null = null;

  return {
    ts,
    cl,
    id,
    toString: () => {
      if (strCache) {
        return strCache;
      }
      return (strCache = serialize(ts, cl, id));
    },
  };
}

function serialize(ts: number, cl: number, id: string): string {
  const dateStr = new Date(ts).toISOString();
  const clStr = cl.toString().padStart(LOGICAL_CLOCK_LENGTH, "0");
  return `${dateStr}|${clStr}|${id}`;
}
