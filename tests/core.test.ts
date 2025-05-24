import { expect } from "@std/expect";
import { MAX_LOGICAL_CLOCK } from "../src/defaults.ts";
import { createHLC } from "../src/hlc.ts";

Deno.test("HLC: send() returns increasing timestamps", () => {
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => 1000 });
  const t1 = hlc.send();
  const t2 = hlc.send();
  expect(t2.ts).toBe(t1.ts);
  expect(t2.cl).toBe(t1.cl + 1);
  expect(t2.id).toBe("node-1");
});

Deno.test("HLC: send() advances physical time", () => {
  let now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const t1 = hlc.send();
  now += 10;
  const t2 = hlc.send();
  expect(t2.ts).toBeGreaterThan(t1.ts);
  expect(t2.cl).toBe(0);
});

Deno.test("HLC: receive() merges remote timestamp correctly", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = { ts: 2000, cl: 3, id: "node-2", toString: () => "" };
  const t = hlc.receive(remote);
  expect(t.ts).toBe(2000);
  expect(t.cl).toBe(4);
  expect(t.id).toBe("node-1");
});

Deno.test("HLC: receive() with local time ahead of remote", () => {
  const now = 3000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = { ts: 2000, cl: 5, id: "node-2", toString: () => "" };
  const t = hlc.receive(remote);
  expect(t.ts).toBe(3000);
  expect(t.cl).toBe(1); // Should be 1, not 0
});

Deno.test("HLC: receive() with remote time ahead of local", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = { ts: 2000, cl: 5, id: "node-2", toString: () => "" };
  const t = hlc.receive(remote);
  expect(t.ts).toBe(2000);
  expect(t.cl).toBe(6);
});

Deno.test("HLC: receive() with all times equal increments max counter", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  // Set state to ts=1000, cl=2
  hlc.send();
  hlc.send();
  const remote = { ts: 1000, cl: 5, id: "node-2", toString: () => "" };
  const t = hlc.receive(remote);
  expect(t.ts).toBe(1000);
  expect(t.cl).toBe(6);
});

Deno.test("HLC: throws on drift violation", () => {
  const now = 1000;
  const hlc = createHLC({
    nodeId: "node-1",
    getWallClockTime: () => now,
    maxDrift: 100,
  });
  const remote = { ts: 2000, cl: 0, id: "node-2", toString: () => "" };
  expect(() => hlc.receive(remote)).toThrow();
});

Deno.test("HLC: throws on counter overflow", () => {
  const now = 1000;
  const MAX = 99999999;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  // @ts-ignore: Forcing internal state for test
  hlc.send = () => ({ ts: now, cl: MAX, id: "node-1", toString: () => "" });
  expect(() =>
    hlc.receive({ ts: now, cl: MAX, id: "node-2", toString: () => "" })
  ).toThrow();
});

Deno.test("HLC: MIN and MAX timestamps are correct", () => {
  const hlc = createHLC({ nodeId: "node-1" });
  expect(hlc.MIN_TIMESTAMP.ts).toBe(0);
  expect(hlc.MAX_TIMESTAMP.ts).toBeGreaterThan(hlc.MIN_TIMESTAMP.ts);
  expect(hlc.MIN_TIMESTAMP.id).toBe("node-1");
  expect(hlc.MAX_TIMESTAMP.id).toBe("node-1");
});

Deno.test("HLC: nodeId uniqueness", () => {
  const hlc1 = createHLC({ nodeId: "a" });
  const hlc2 = createHLC({ nodeId: "b" });
  expect(hlc1.nodeId).not.toBe(hlc2.nodeId);
});

Deno.test("HLC: createHLC uses default options", () => {
  const hlc = createHLC();
  const t = hlc.send();
  expect(typeof hlc.nodeId).toBe("string");
  expect(typeof t.ts).toBe("number");
  expect(typeof t.cl).toBe("number");
  expect(typeof t.id).toBe("string");
});

Deno.test(
  "HLC: MIN_HLC_TIMESTAMP and MAX_HLC_TIMESTAMP constants",
  async () => {
    // These are exported constants
    const { MIN_HLC_TIMESTAMP, MAX_HLC_TIMESTAMP } = await import(
      "../src/hlc.ts"
    );
    expect(MIN_HLC_TIMESTAMP.ts).toBe(0);
    expect(MAX_HLC_TIMESTAMP.ts).toBeGreaterThan(MIN_HLC_TIMESTAMP.ts);
  },
);

Deno.test(
  "createSafeHLCTimestamp throws on drift over maxDrift (internal)",
  () => {
    // Use createHLC to access internal via receive
    const hlc = createHLC({
      nodeId: "test",
      getWallClockTime: () => 1000,
      maxDrift: 10,
    });
    // Simulate remote timestamp with large drift
    expect(() =>
      hlc.receive({ ts: 2000, cl: 0, id: "remote", toString: () => "" })
    ).toThrow(/Drift detected/);
  },
);

Deno.test(
  "createSafeHLCTimestamp throws on counter overflow (internal)",
  () => {
    const MAX = MAX_LOGICAL_CLOCK;
    const hlc = createHLC({ nodeId: "test", getWallClockTime: () => 1000 });
    // Patch state to simulate counter at MAX-1, then send to overflow
    // @ts-ignore: test internal
    hlc.send = () => ({ ts: 1000, cl: MAX, id: "test", toString: () => "" });
    expect(() =>
      hlc.receive({ ts: 1000, cl: MAX, id: "remote", toString: () => "" })
    ).toThrow(/Counter overflow/);
  },
);

Deno.test("HLC: receive() accepts string input", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  // Use a string with ts=1000 to avoid drift error
  const remoteStr = "1970-01-01T00:00:01.000Z|00000003|node-2";
  // Should parse and merge correctly
  const t = hlc.receive(remoteStr);
  expect(t.ts).toBe(1000);
  expect(t.cl).toBe(4);
  expect(t.id).toBe("node-1");
});

Deno.test("HLC: receive() throws on invalid string input", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  expect(() => hlc.receive("not-a-valid-hlc-string")).toThrow();
});
