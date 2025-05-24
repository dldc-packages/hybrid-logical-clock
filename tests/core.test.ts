import { expect } from "@std/expect";
import { MAX_LOGICAL_CLOCK } from "../src/defaults.ts";
import { createHLC } from "../src/hlc.ts";
import { createHLCTimestamp } from "../src/internal.ts";

Deno.test("send() returns increasing timestamps", () => {
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => 1000 });
  const t1 = hlc.send();
  const t2 = hlc.send();
  expect(t2.ts).toBe(t1.ts);
  expect(t2.cl).toBe(t1.cl + 1);
  expect(t2.id).toBe("node-1");
});

Deno.test("send() advances physical time", () => {
  let now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const t1 = hlc.send();
  now += 10;
  const t2 = hlc.send();
  expect(t2.ts).toBeGreaterThan(t1.ts);
  expect(t2.cl).toBe(0);
});

Deno.test("receive() merges remote timestamp correctly", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = createHLCTimestamp(2000, 3, "node-2");
  const t = hlc.receive(remote);
  expect(t.ts).toBe(2000);
  expect(t.cl).toBe(4);
  expect(t.id).toBe("node-1");
});

Deno.test("receive() with local time ahead of remote", () => {
  const now = 3000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = createHLCTimestamp(2000, 5, "node-2");
  const t = hlc.receive(remote);
  expect(t.ts).toBe(3000);
  expect(t.cl).toBe(1); // Should be 1, not 0
});

Deno.test("receive() with remote time ahead of local", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  const remote = createHLCTimestamp(2000, 5, "node-2");
  const t = hlc.receive(remote);
  expect(t.ts).toBe(2000);
  expect(t.cl).toBe(6);
});

Deno.test("receive() with all times equal increments max counter", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  // Set state to ts=1000, cl=2
  hlc.send();
  hlc.send();
  const remote = createHLCTimestamp(1000, 5, "node-2");
  const t = hlc.receive(remote);
  expect(t.ts).toBe(1000);
  expect(t.cl).toBe(6);
});

Deno.test("throws on drift violation", () => {
  const now = 1000;
  const hlc = createHLC({
    nodeId: "node-1",
    getWallClockTime: () => now,
    maxDrift: 100,
  });
  const remote = createHLCTimestamp(2000, 0, "node-2");
  expect(() => hlc.receive(remote)).toThrow();
});

Deno.test("throws on counter overflow", () => {
  const now = 1000;
  const MAX = 99999999;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  // @ts-ignore: Forcing internal state for test
  hlc.send = () => createHLCTimestamp(now, MAX, "node-1");
  expect(() => hlc.receive(createHLCTimestamp(now, MAX, "node-2"))).toThrow();
});

Deno.test("MIN and MAX timestamps are correct", () => {
  const hlc = createHLC({ nodeId: "node-1" });
  expect(hlc.MIN_TIMESTAMP.ts).toBe(0);
  expect(hlc.MAX_TIMESTAMP.ts).toBeGreaterThan(hlc.MIN_TIMESTAMP.ts);
  expect(hlc.MIN_TIMESTAMP.id).toBe("node-1");
  expect(hlc.MAX_TIMESTAMP.id).toBe("node-1");
});

Deno.test("nodeId uniqueness", () => {
  const hlc1 = createHLC({ nodeId: "a" });
  const hlc2 = createHLC({ nodeId: "b" });
  expect(hlc1.nodeId).not.toBe(hlc2.nodeId);
});

Deno.test("createHLC uses default options", () => {
  const hlc = createHLC();
  const t = hlc.send();
  expect(typeof hlc.nodeId).toBe("string");
  expect(typeof t.ts).toBe("number");
  expect(typeof t.cl).toBe("number");
  expect(typeof t.id).toBe("string");
});

Deno.test(
  "MIN_HLC_TIMESTAMP and MAX_HLC_TIMESTAMP constants",
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
    expect(() => hlc.receive(createHLCTimestamp(2000, 0, "remote"))).toThrow(
      /Drift detected/,
    );
  },
);

Deno.test(
  "createSafeHLCTimestamp throws on counter overflow (internal)",
  () => {
    const MAX = MAX_LOGICAL_CLOCK;
    const hlc = createHLC({ nodeId: "test", getWallClockTime: () => 1000 });
    // Patch state to simulate counter at MAX-1, then send to overflow
    // @ts-ignore: test internal
    hlc.send = () => createHLCTimestamp(1000, MAX, "test");
    expect(() => hlc.receive(createHLCTimestamp(1000, MAX, "remote"))).toThrow(
      /Counter overflow/,
    );
  },
);

Deno.test("receive() accepts string input", () => {
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

Deno.test("receive() throws on invalid string input", () => {
  const now = 1000;
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => now });
  expect(() => hlc.receive("not-a-valid-hlc-string")).toThrow();
});

Deno.test("can restore a clock by passing last timestamp", () => {
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => 1000 });
  const t1 = hlc.send();
  expect(t1.toString()).toBe("1970-01-01T00:00:01.000Z|00000001|node-1");
  const restoredHLC = createHLC({
    nodeId: "node-1",
    getWallClockTime: () => 1000,
    initialTimestamp: t1,
  });
  const t2 = restoredHLC.send();
  expect(t2.toString()).toBe("1970-01-01T00:00:01.000Z|00000002|node-1");
});

Deno.test("restore should not restore nodeId ", () => {
  const hlc = createHLC({ nodeId: "node-1", getWallClockTime: () => 1000 });
  const t1 = hlc.send();
  expect(t1.toString()).toBe("1970-01-01T00:00:01.000Z|00000001|node-1");
  const restoredHLC = createHLC({
    nodeId: "node-2",
    getWallClockTime: () => 1000,
    initialTimestamp: t1,
  });
  const t2 = restoredHLC.send();
  expect(t2.toString()).toBe("1970-01-01T00:00:01.000Z|00000002|node-2");
});

Deno.test("send() monotonically with regressing clock", () => {
  let now = 30;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  const t1 = hlc.send();
  now--;
  const t2 = hlc.send();
  expect(t2.ts).toBe(t1.ts);
  expect(t2.cl).toBe(t1.cl + 1);
  const t3 = hlc.send();
  expect(t3.ts).toBe(t1.ts);
  expect(t3.cl).toBe(t2.cl + 1);
  now = 31;
  const t4 = hlc.send();
  expect(t4.ts).toBeGreaterThan(t1.ts);
  expect(t4.cl).toBe(0);
});

Deno.test("send() fails with counter overflow", () => {
  const now = 40;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  // Patch state to simulate counter at MAX_LOGICAL_CLOCK - 1, then send to overflow
  // @ts-ignore: test internal
  hlc.send = () => createHLCTimestamp(now, MAX_LOGICAL_CLOCK, "test");
  expect(() =>
    hlc.receive(
      createHLCTimestamp(now, MAX_LOGICAL_CLOCK, "remote"),
    )
  ).toThrow();
});

Deno.test("receive() monotonically with regressing local clock", () => {
  let now = 93;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  const remote = createHLCTimestamp(91, 2, "remote");
  const t1 = hlc.receive(remote);
  expect(t1.ts).toBe(93);
  expect(t1.cl).toBe(1);
  now = 92;
  const remote2 = createHLCTimestamp(92, 2, "remote");
  const t2 = hlc.receive(remote2);
  expect(t2.ts).toBe(93); // Should remain at the max of local/remote/last
  expect(t2.cl).toBe(2);
});

Deno.test("receive() fails with clock drift", () => {
  const hlc = createHLC({
    nodeId: "test",
    getWallClockTime: () => 0,
    maxDrift: 1000,
  });
  const remote = createHLCTimestamp(2000, 0, "remote");
  expect(() => hlc.receive(remote)).toThrow();
});

Deno.test("receive() with remote all ts different", () => {
  let now = 1000;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  const remote = createHLCTimestamp(2000, 0, "remote");
  now += 2000;
  const t = hlc.receive(remote);
  expect(t.toString()).toBe("1970-01-01T00:00:03.000Z|00000000|test");
});
