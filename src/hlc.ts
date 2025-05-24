import {
  DEFAULT_CREATE_NODE_ID,
  DEFAULT_MAX_DRIFT,
  DEFAULT_WALL_CLOCK_TIME,
  MAX_EPOCH,
  MAX_LOGICAL_CLOCK,
} from "./defaults.ts";
import {
  throwClockDriftOverflow,
  throwLogicalCounterOverflow,
  throwTimestampParsingError,
} from "./erreur.ts";
import { createHLCTimestamp } from "./internal.ts";
import type { HLCInstance, HLCInstanceOptions, HLCTimestamp } from "./types.ts";

/**
 * The minimum possible Hybrid Logical Clock (HLC) timestamp.
 *
 * This constant represents the earliest valid HLC timestamp, with all components
 * (physical time, logical counter, and node ID) set to their minimum values.
 *
 * @remarks
 * This assumes a node ID using the default UUID format.
 *
 * @remarks
 * Useful as an initial value or lower bound when comparing or initializing HLC timestamps.
 *
 * @see {@link HLCTimestamp}
 * @see {@link createHLCTimestamp}
 */
export const MIN_HLC_TIMESTAMP: HLCTimestamp = createHLCTimestamp(
  0,
  0,
  `00000000-0000-0000-0000-000000000000`,
);

/**
 * The maximum possible Hybrid Logical Clock (HLC) timestamp.
 *
 * This constant represents the upper bound for HLC timestamps, using the maximum values
 * for epoch and logical clock, and a UUID with all bits set to `f`.
 *
 * @remarks
 * This assumes a node ID using the default UUID format.
 *
 * @remarks
 * Useful for comparisons, boundary checks, and as a sentinel value in HLC-based systems.
 *
 * @see {@link createHLCTimestamp}
 * @see {@link HLCTimestamp}
 */
export const MAX_HLC_TIMESTAMP: HLCTimestamp = createHLCTimestamp(
  MAX_EPOCH,
  MAX_LOGICAL_CLOCK,
  `ffffffff-ffff-ffff-ffff-ffffffffffff`,
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
    initialTimestamp,
  } = options;
  // Internal state for the HLC instance, captured by closure.
  // Initialize with current physical time. This ensures state is set to a valid current HLC time.
  const initialTimestampObj = initialTimestamp
    ? toHLCTimestamp(initialTimestamp)
    : null;
  let state: HLCTimestamp = createHLCTimestamp(
    initialTimestampObj?.ts ?? getWallClockTime(),
    initialTimestampObj?.cl ?? 0,
    nodeId,
  );

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

  function receive(remoteTimestamp: HLCTimestamp | string): HLCTimestamp {
    const remote = toHLCTimestamp(remoteTimestamp);
    const tsNow = getWallClockTime();
    const ptLocalLast = state.ts;
    const lLocalLast = state.cl;
    const ptRemote = remote.ts;
    const lRemote = remote.cl;

    const newPt = Math.max(tsNow, ptLocalLast, ptRemote);

    if (newPt === ptLocalLast && newPt === ptRemote) {
      return (state = createSafeHLCTimestamp(
        tsNow,
        newPt,
        Math.max(lLocalLast, lRemote) + 1,
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
    cl: number,
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
  t2: HLCTimestamp,
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
  try {
    return parseHLCTimestampStrict(hlcString);
  } catch {
    return null;
  }
}

/**
 * Parses a Hybrid Logical Clock (HLC) timestamp string in strict format.
 *
 * The expected format is: `ISO8601|logicalCounter|nodeId`.
 * - `ISO8601`: A valid ISO8601 date string (e.g., "2025-05-22T12:34:56.789Z").
 * - `logicalCounter`: An 8-digit, non-negative integer representing the logical clock (e.g., "00000001").
 * - `nodeId`: A non-empty string identifying the node.
 *
 * @param hlcString - The HLC timestamp string to parse.
 * @returns The parsed `HLCTimestamp` object.
 * @throws Will throw an error if the input string is not in the correct format,
 *         or if any of the components are invalid (invalid date, logical counter, or nodeId).
 *
 * @example
 * const ts = parseHLCTimestampStrict("2025-05-22T12:34:56.789Z|00000001|node-2");
 * // ts: { ts: 1747926896789, cl: 1, id: "node-2", toString: ... }
 */
export function parseHLCTimestampStrict(hlcString: string): HLCTimestamp {
  const parts = hlcString.split("|");
  if (parts.length !== 3) {
    return throwTimestampParsingError(
      hlcString,
      "Invalid format, expected ISO8601|logicalCounter|nodeId",
    );
  }
  const [dateStr, clStr, id] = parts;
  if (!id || typeof id !== "string" || id.length < 1) {
    return throwTimestampParsingError(hlcString, "Invalid nodeId");
  }
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts) || ts < 0 || ts > MAX_EPOCH) {
    return throwTimestampParsingError(hlcString, "Invalid timestamp");
  }
  const cl = parseInt(clStr, 10);
  if (isNaN(cl) || cl < 0 || cl > MAX_LOGICAL_CLOCK) {
    return throwTimestampParsingError(hlcString, "Invalid logical counter");
  }
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

/**
 * Converts the given value to an `HLCTimestamp` object.
 *
 * If the input is already an `HLCTimestamp`, it is returned as-is.
 * If the input is a string, it is parsed into an `HLCTimestamp` using `parseHLCTimestampStrict`.
 *
 * @param hlc - The value to convert, either an `HLCTimestamp` object or a string representation.
 * @returns The corresponding `HLCTimestamp` object.
 */
export function toHLCTimestamp(
  hlc: HLCTimestamp | string,
): HLCTimestamp {
  if (typeof hlc === "string") {
    return parseHLCTimestampStrict(hlc);
  }
  return hlc;
}
