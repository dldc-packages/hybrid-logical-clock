/**
 * A function that returns the current wall clock time as a number (e.g., milliseconds since epoch).
 */
export type GetWallClockTime = () => number;

/**
 * Represents a Hybrid Logical Clock (HLC) timestamp.
 *
 * @remarks
 * An HLC timestamp consists of:
 * - `ts`: The physical time component (e.g., milliseconds since epoch).
 * - `cl`: The logical counter, used to order events with the same physical time.
 * - `id`: A unique node identifier.
 *
 * @example
 * ```typescript
 * const timestamp: HLCTimestamp = {
 *   ts: Date.now(),
 *   cl: 0,
 *   id: "node-1",
 *   toString: () => "2024-06-01T12:00:00.000Z|0|node-1"
 * };
 * ```
 */
export interface HLCTimestamp {
  /**
   * The physical time component of the timestamp.
   * Typically represented as milliseconds since the Unix epoch.
   */
  readonly ts: number;

  /**
   * The logical counter component of the timestamp.
   * Used to distinguish events that occur at the same physical time.
   */
  readonly cl: number;

  /**
   * The unique identifier for the node that generated this timestamp.
   */
  readonly id: string;

  /**
   * Returns a string representation of the timestamp.
   *
   * @returns A string in the format: ISO8601|logicalCounter|nodeId
   */
  readonly toString: () => string;
}

/**
 * Represents an instance of a Hybrid Logical Clock (HLC) with operational methods.
 *
 * @remarks
 * Provides methods to generate and merge HLC timestamps for distributed systems.
 */
export interface HLCInstance {
  /**
   * The unique identifier for this clock instance.
   */
  readonly nodeId: string;

  /**
   * Generates a new HLC timestamp for a local or send event.
   *
   * @returns The new {@link HLCTimestamp} for the event.
   */
  send: () => HLCTimestamp;

  /**
   * Updates the local clock upon receiving a remote HLC timestamp.
   *
   * @param remoteTimestamp - The remote {@link HLCTimestamp} or string to merge.
   * @returns The new {@link HLCTimestamp} after merging.
   */
  receive: (remoteTimestamp: HLCTimestamp | string) => HLCTimestamp;

  /**
   * The minimum possible timestamp value for this clock instance.
   */
  readonly MIN_TIMESTAMP: HLCTimestamp;

  /**
   * The maximum possible timestamp value for this clock instance.
   */
  readonly MAX_TIMESTAMP: HLCTimestamp;
}

/**
 * Options for creating a Hybrid Logical Clock (HLC) instance.
 */
export interface HLCInstanceOptions {
  /**
   * Optional unique identifier for the clock instance.
   * If not provided, a random UUID will be generated.
   */
  nodeId?: string;

  /**
   * Optional function to retrieve the current physical time.
   * Defaults to {@link Date.now}.
   */
  getWallClockTime?: GetWallClockTime;

  /**
   * Optional maximum allowed drift in milliseconds.
   * Defaults to 5 minutes.
   */
  maxDrift?: number;
}
