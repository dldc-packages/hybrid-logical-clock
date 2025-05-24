# Hybrid Logical Clock

A robust, minimal, and standards-compliant Hybrid Logical Clock (HLC)
implementation for Deno and JavaScript/TypeScript. HLCs are used in distributed
systems to generate timestamps that combine physical and logical time, enabling
causality tracking and event ordering even in the presence of clock skew.

## Installation

```sh
deno add jsr:@dldc/hybrid-logical-clock
```

## Overview

This package provides a simple and safe way to generate and merge Hybrid Logical
Clock timestamps. It is ideal for distributed systems, CRDTs, event sourcing,
and any scenario where you need to track causality and order events across
nodes.

- **Monotonic and Causally Consistent**: Ensures timestamps never go backward
  and reflect causal relationships.
- **Customizable**: Supports custom node IDs, wall clock sources, and drift
  limits.
- **Safe**: Throws on excessive clock drift or logical counter overflow.
- **Strict Parsing**: Invalid timestamp strings throw or return `null`.
- **Constants**: Provides `MIN_HLC_TIMESTAMP` and `MAX_HLC_TIMESTAMP` for global
  bounds.

## Usage Example

```ts
import {
  compareHLCTimestamps,
  createHLC,
  MAX_HLC_TIMESTAMP,
  MIN_HLC_TIMESTAMP,
  parseHLCTimestamp,
  parseHLCTimestampStrict,
  serializeHLC,
} from "@dldc/hybrid-logical-clock";

// Create a new HLC instance (nodeId is optional)
const hlc = createHLC({ nodeId: "node-1" });

// Generate a timestamp for a local/send event
const t1 = hlc.send();

// Merge a remote timestamp (e.g., from another node)
const remote = parseHLCTimestamp("2025-05-22T12:34:56.789Z|00000001|node-2");
const t2 = hlc.receive(remote!);

// Or merge directly from a string (throws if invalid)
// const t2 = hlc.receive("2025-05-22T12:34:56.789Z|00000001|node-2");

// Serialize/deserialize
const str = serializeHLC(t2); // or t2.toString()
const parsed = parseHLCTimestamp(str);

// Parse in strict mode
const strictParsed = parseHLCTimestampStrict(
  "2025-05-22T12:34:56.789Z|00000001|node-2",
);

// Compare timestamps
const cmp = compareHLCTimestamps(t1, t2); // -1, 0, or 1

// Use global min/max constants
MIN_HLC_TIMESTAMP;
MAX_HLC_TIMESTAMP;
```

## Library Specificities

- **Drift Detection**: If the physical time difference between local and remote
  exceeds `maxDrift` (default: 5 minutes), an error is thrown.
- **Logical Counter Overflow**: If the logical counter exceeds 99,999,999 (8
  digits), an error is thrown.
- **Timestamps**: Timestamps are objects with `{ ts, cl, id, toString() }` and
  serialize to `YYYY-MM-DDTHH:mm:ss.sssZ|00000001|nodeId` (ISO8601, 8-digit
  logical counter, nodeId).
- **Customizable**: You can provide your own node ID, wall clock function, and
  drift limit.
- **Strict Parsing**: `parseHLCTimestamp` returns `null` for invalid input;
  `receive` with an invalid string throws.
- **Constants**: `MIN_HLC_TIMESTAMP` and `MAX_HLC_TIMESTAMP` are available for
  global bounds.

## API Reference

### `createHLC(options?: HLCInstanceOptions): HLCInstance`

Creates a new Hybrid Logical Clock instance.

**Options:**

- `nodeId?: string` — Unique identifier for this node (default: random UUID).
- `getWallClockTime?: () => number` — Function to get current time (default:
  `Date.now()`).
- `maxDrift?: number` — Maximum allowed drift in ms (default: 5 minutes).
- `initialTimestamp?: HLCTimestamp | string` — (Optional) The initial timestamp
  to start the clock from. Useful for restoring state or resuming from a
  persisted timestamp. If a string is provided, it must be a valid HLC timestamp
  string.

**Returns:** `HLCInstance` object:

- `nodeId: string` — The node's unique ID.
- `send(): HLCTimestamp` — Generate a new timestamp for a local/send event.
- `receive(remote: HLCTimestamp | string): HLCTimestamp` — Merge a remote
  timestamp (object or string; string must be valid or throws).
- `MIN_TIMESTAMP: HLCTimestamp` — Minimum possible timestamp for this node.
- `MAX_TIMESTAMP: HLCTimestamp` — Maximum possible timestamp for this node.

---

### `HLCTimestamp`

Represents a timestamp:

- `ts: number` — Physical time (ms since epoch).
- `cl: number` — Logical counter (0 to 99,999,999).
- `id: string` — Node ID.
- `toString(): string` — String representation
  (`YYYY-MM-DDTHH:mm:ss.sssZ|00000001|nodeId`).

---

### `compareHLCTimestamps(t1: HLCTimestamp, t2: HLCTimestamp): number`

Compares two timestamps.

- Returns `-1` if `t1 < t2`, `0` if equal, `1` if `t1 > t2`.

---

### `serializeHLC(hlc: HLCTimestamp): string`

Serializes a timestamp to string (same as `hlc.toString()`).

---

### `parseHLCTimestamp(str: string): HLCTimestamp | null`

Parses a string into a timestamp, or returns `null` if invalid.

- The string must be in the format: `YYYY-MM-DDTHH:mm:ss.sssZ|00000001|nodeId`
  (ISO8601, 8-digit logical counter, nodeId).
- Returns `null` for invalid input.

---

### `parseHLCTimestampStrict(str: string): HLCTimestamp`

Parses a string into a timestamp in strict mode.

- The string must be in the format: `YYYY-MM-DDTHH:mm:ss.sssZ|00000001|nodeId`
  (ISO8601, 8-digit logical counter, nodeId).
- Returns the parsed `HLCTimestamp` object if valid.
- Throws an error if the string is not in the correct format or any component is
  invalid (invalid date, logical counter, or nodeId).

**Example:**

```ts
const ts = parseHLCTimestampStrict("2025-05-22T12:34:56.789Z|00000001|node-2");
// ts: { ts: 1747926896789, cl: 1, id: "node-2", toString: ... }
```

---

### `MIN_HLC_TIMESTAMP` / `MAX_HLC_TIMESTAMP`

Global constants for the absolute minimum and maximum possible HLC timestamps
(across all nodes).

---

## Example: Handling Events

```ts
const hlcA = createHLC({ nodeId: "A" });
const hlcB = createHLC({ nodeId: "B" });

// Node A sends an event
const tsA = hlcA.send();

// Node B receives the event from A
const tsB = hlcB.receive(tsA);

// Now, tsB > tsA and reflects the causal relationship
```

## Example: Restoring a Clock

You can restore a clock's state by passing the last timestamp to
`initialTimestamp` when creating a new HLC instance. This is useful for resuming
from a persisted state.

```ts
const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => 1000 });
const t1 = hlc.send();
// t1.toString() === "1970-01-01T00:00:01.000Z|00000001|node-1"

// Restore the clock from the last timestamp
const restoredHLC = createHLC({
  nodeId: "node-1",
  getWallClockTime: () => 1000,
  initialTimestamp: t1,
});
const t2 = restoredHLC.send();
// t2.toString() === "1970-01-01T00:00:01.000Z|00000002|node-1"
```

## Error Handling

- If the drift between local and remote timestamps exceeds `maxDrift`, an error
  is thrown.
- If the logical counter exceeds its maximum, an error is thrown.
- If you pass an invalid string to `receive`, an error is thrown.
- Use `parseHLCTimestamp` to safely check if a string is valid (returns `null`
  if not).

Errors metadata are exposed using [@dldc/erreur](https://jsr.io/@dldc/erreur),
you can extract them like this:

```ts
import { HLCErreur } from "@dldc/hybrid-logical-clock";

try {
  // your code that may throw an HLC error
} catch (error) {
  const hlcError = HLCErreur.get(error);
  //    ^^^^^^^^ null | THLCErreurData
  if (hlcError && hlcError.kind === "TimestampParsingError") {
    // Handle timestamp parsing error
  }
}
```

## License

MIT
