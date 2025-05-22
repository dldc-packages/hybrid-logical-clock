import { expect } from "@std/expect";
import { MAX_LOGICAL_CLOCK } from "../src/defaults.ts";
import { createHLC, parseHLCTimestamp, serializeHLC } from "../src/hlc.ts";

Deno.test("parseHLCTimestamp: invalid inputs return null", async (t) => {
  const invalidInputs = [
    null,
    undefined,
    {},
    [],
    42,
    "",
    " ",
    "0",
    "invalid",
    "1969-1-1T0:0:0.0Z-0-0-0",
    "1969-01-01T00:00:00.000Z-0000-0000000000000000",
    "10000-01-01T00:00:00.000Z-FFFF-FFFFFFFFFFFFFFFF",
    "9999-12-31T23:59:59.999Z-10000-FFFFFFFFFFFFFFFF",
    "9999-12-31T23:59:59.999Z-FFFF-10000000000000000",
    "1969-1-1T0:0:0.0Z|0|0|0",
    "1969-01-01T00:00:00.000Z|0000|0000000000000000",
    "10000-01-01T00:00:00.000Z|FFFF|FFFFFFFFFFFFFFFF",
    "9999-12-31T23:59:59.999Z|FFFF|10000000000000000",
    "2020-01-01T00:00:00.000Z|notanumber|node",
    "2020-01-01T00:00:00.000Z|00000001|",
    "2020-01-01T00:00:00.000Z||node",
    "|00000001|node",
    "2020-01-01T00:00:00.000Z|00000001",
    "2020-01-01T00:00:00.000Z|00000001|node|extra",
    "2020-01-01T00:00:00.000Z|00000001|node|",
    "notadate|00000001|node",
    "2020-01-01T00:00:00.000Z|18446744073709551616|node", // cl too large
    "2020-01-01T00:00:00.000Z|-1|node", // negative cl
  ];
  for (const input of invalidInputs) {
    await t.step(
      `should return null for input: ${JSON.stringify(input)}`,
      () => {
        let result;
        try {
          result = parseHLCTimestamp(input as any);
        } catch (_) {
          result = null;
        }
        expect(result).toBeNull();
      },
    );
  }
});

Deno.test("parseHLCTimestamp: valid inputs roundtrip", () => {
  const validInputs = [
    "1970-01-01T00:00:00.000Z|00000001|node",
    "2015-04-24T22:23:42.123Z|00000001|node",
    "9999-12-31T23:59:59.999Z|00000001|node",
    "2020-01-01T00:00:00.000Z|00000001|a", // single char id (should be valid)
    "2020-01-01T00:00:00.000Z|00000001|*", // single char id (should be valid)
    "2020-01-01T00:00:00.000Z|00000001| ", // whitespace id (should be valid)
    "2020-01-01T00:00:00.000Z|00000001|\t", // tab id (should be valid)
    "2020-01-01T00:00:00.000Z|00000001|\n", // newline id (should be valid)
  ];
  for (const input of validInputs) {
    const parsed = parseHLCTimestamp(input);
    expect(parsed).not.toBeNull();
    expect(typeof parsed!.ts).toBe("number");
    expect(typeof parsed!.cl).toBe("number");
    expect(typeof parsed!.id).toBe("string");
    expect(serializeHLC(parsed!)).toBe(input);
  }
});

Deno.test("HLC: send() monotonically with regressing clock", () => {
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

Deno.test("HLC: send() fails with counter overflow", () => {
  const now = 40;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  // Patch state to simulate counter at MAX_LOGICAL_CLOCK - 1, then send to overflow
  // @ts-ignore: test internal
  hlc.send = () => ({
    ts: now,
    cl: MAX_LOGICAL_CLOCK,
    id: "test",
    toString: () => "",
  });
  expect(() =>
    hlc.receive({
      ts: now,
      cl: MAX_LOGICAL_CLOCK,
      id: "remote",
      toString: () => "",
    })
  ).toThrow();
});

Deno.test("HLC: receive() monotonically with regressing local clock", () => {
  let now = 93;
  const hlc = createHLC({ nodeId: "test", getWallClockTime: () => now });
  const remote = { ts: 91, cl: 2, id: "remote", toString: () => "" };
  const t1 = hlc.receive(remote);
  expect(t1.ts).toBe(93);
  expect(t1.cl).toBe(1);
  now = 92;
  const remote2 = { ts: 92, cl: 2, id: "remote", toString: () => "" };
  const t2 = hlc.receive(remote2);
  expect(t2.ts).toBe(93); // Should remain at the max of local/remote/last
  expect(t2.cl).toBe(2);
});

Deno.test("HLC: receive() fails with clock drift", () => {
  const hlc = createHLC({
    nodeId: "test",
    getWallClockTime: () => 0,
    maxDrift: 1000,
  });
  const remote = { ts: 2000, cl: 0, id: "remote", toString: () => "" };
  expect(() => hlc.receive(remote)).toThrow();
});
