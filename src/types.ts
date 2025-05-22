/**
 * Represents a Hybrid Logical Clock timestamp.
 * It consists of a physical time component (ts), a logical counter (cl),
 * and a unique node identifier (id).
 */
export interface HLCTimestamp {
  /**
   * Physical time (e.g., milliseconds since epoch)
   */
  readonly ts: number;

  /**
   * Logical counter
   */
  readonly cl: number;

  /**
   * Node ID
   */
  readonly id: string;

  /**
   * Get a string representation of the timestamp.
   * Format: ISO8601|logicalCounter|nodeId
   */
  readonly toString: () => string;
}

/**
 * An object representing an HLC instance with its operational methods.
 */
export interface HLCInstance {
  /**
   * Unique identifier for this clock instance
   */
  readonly nodeId: string;

  /**
   * Generates a new timestamp for a send event or a local event.
   * This is the primary method to advance the clock's time.
   * @returns The new HLCTimestamp for the event.
   */
  send: () => HLCTimestamp;

  /**
   * Updates the local clock upon receiving an event with a remote timestamp.
   * @param remoteTimestamp - The remote HLCTimestamp to merge.
   * @returns The new HLCTimestamp after merging.
   */
  receive: (remoteTimestamp: HLCTimestamp) => HLCTimestamp;

  /**
   * Minimum timestamp value for this clock instance (nodeId).
   */
  readonly MIN_TIMESTAMP: HLCTimestamp;

  /**
   * Maximum timestamp value for this clock instance (nodeId).
   */
  readonly MAX_TIMESTAMP: HLCTimestamp;
}

/**
 * Options for creating a Hybrid Logical Clock instance.
 */
export interface HLCInstanceOptions {
  /**
   * Optional unique identifier for the clock instance (defaults to a random UUID)
   */
  nodeId?: string;

  /**
   * Function to get the current physical time (defaults to Date.now()).
   */
  getWallClockTime?: () => number;

  /**
   * Optional maximum drift in milliseconds (defaults to 5 minutes)
   */
  maxDrift?: number;
}
