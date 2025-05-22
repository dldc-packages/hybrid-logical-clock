import type { GetWallClockTime } from "./types.ts";

/**
 * The default maximum allowed drift (in milliseconds) between local and remote physical clocks.
 * Used to detect and prevent excessive clock skew. Default: 5 minutes.
 */
export const DEFAULT_MAX_DRIFT: number = 5 * 60 * 1000; // 5 minutes

/**
 * The default function to get the current wall clock time (in ms since epoch).
 * By default, uses Date.now().
 */
export const DEFAULT_WALL_CLOCK_TIME: GetWallClockTime = () => Date.now();

/**
 * The default function to generate a unique node identifier for a clock instance.
 * By default, uses crypto.randomUUID().
 */
export const DEFAULT_CREATE_NODE_ID: () => string = () => crypto.randomUUID();

/**
 * The number of digits used for the logical clock counter in string representations.
 * Default: 8 digits (e.g., 00000001).
 */
export const LOGICAL_CLOCK_LENGTH: number = 8; // 8 digits

/**
 * The maximum value for the logical clock counter.
 * Default: 99999999 (8 digits).
 */
export const MAX_LOGICAL_CLOCK: number = Math.pow(10, LOGICAL_CLOCK_LENGTH) - 1; // 99999999

/**
 * The maximum allowed epoch timestamp (in ms since epoch).
 * After year 9999, ISO format adds a + sign to the year which makes it not sortable.
 * Default: 9999-12-31T23:59:59.999Z
 */
export const MAX_EPOCH: number = 253402300799999; // 9999-12-31T23:59:59.999Z
