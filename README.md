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
- **Safe**: Detects and throws on excessive clock drift or logical counter
  overflow.

## Usage Example

```ts
import {
  compareHLCTimestamps,
  createHLC,
  parseHLCTimestamp,
} from "@dldc/hybrid-logical-clock";

// Create a new HLC instance (nodeId is optional)
const hlc = createHLC({ nodeId: "node-1" });

// Generate a timestamp for a local/send event
const t1 = hlc.send();

// Merge a remote timestamp (e.g., from another node)
const remote = parseHLCTimestamp("2025-05-22T12:34:56.789Z|00000001|node-2");
const t2 = hlc.receive(remote!);

// Serialize/deserialize
const str = t2.toString();
const parsed = parseHLCTimestamp(str);

// Compare timestamps
const cmp = compareHLCTimestamps(t1, t2); // -1, 0, or 1
```

## Library Specificities

- **Drift Detection**: If the physical time difference between local and remote
  exceeds `maxDrift` (default: 5 minutes), an error is thrown.
- **Logical Counter Overflow**: If the logical counter exceeds 99,999,999, an
  error is thrown.
- **Timestamps**: Timestamps are objects with `{ ts, cl, id, toString() }` and
  serialize to ISO8601|logical|nodeId.
- **Customizable**: You can provide your own node ID, wall clock function, and
  drift limit.

## API Reference

### `createHLC(options?: HLCInstanceOptions): HLCInstance`

Creates a new Hybrid Logical Clock instance.

**Options:**

- `nodeId?: string` — Unique identifier for this node (default: random UUID).
- `getWallClockTime?: () => number` — Function to get current time (default:
  `Date.now()`).
- `maxDrift?: number` — Maximum allowed drift in ms (default: 5 minutes).

**Returns:** `HLCInstance` object:

- `nodeId: string` — The node's unique ID.
- `send(): HLCTimestamp` — Generate a new timestamp for a local/send event.
- `receive(remote: HLCTimestamp): HLCTimestamp` — Merge a remote timestamp.
- `MIN_TIMESTAMP: HLCTimestamp` — Minimum possible timestamp for this node.
- `MAX_TIMESTAMP: HLCTimestamp` — Maximum possible timestamp for this node.

---

### `HLCTimestamp`

Represents a timestamp:

- `ts: number` — Physical time (ms since epoch).
- `cl: number` — Logical counter.
- `id: string` — Node ID.
- `toString(): string` — String representation
  (`YYYY-MM-DDTHH:mm:ss.sssZ|00000001|nodeId`).

---

### `compareHLCTimestamps(t1: HLCTimestamp, t2: HLCTimestamp): number`

Compares two timestamps.

- Returns `-1` if `t1 < t2`, `0` if equal, `1` if `t1 > t2`.

---

### `serializeHLC(hlc: HLCTimestamp): string`

Serializes a timestamp to string.

---

### `parseHLCTimestamp(str: string): HLCTimestamp | null`

Parses a string into a timestamp, or returns `null` if invalid.

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

## License

MIT
