import { expect } from "@std/expect";
import { createHLC, parseHLCTimestamp, serializeHLC } from "../src/hlc.ts";

Deno.test("HLC: serialization and parsing roundtrip", () => {
  const hlc = createHLC({
    nodeId: "node-1",
    getWallClockTime: () => 1234567890000,
  });
  const t = hlc.send();
  const str = serializeHLC(t);
  // Should use '|' as separator
  expect(str.split("|").length).toBe(3);
  const parsed = parseHLCTimestamp(str);
  expect(parsed).not.toBeNull();
  expect(parsed!.ts).toBe(t.ts);
  expect(parsed!.cl).toBe(t.cl);
  expect(parsed!.id).toBe(t.id);
});

Deno.test("HLC: parseHLCTimestamp returns null for invalid input", () => {
  // Too few parts
  expect(parseHLCTimestamp("2025-05-22T12:34:56.789Z|00000001")).toBeNull();
  // Non-numeric counter
  expect(
    parseHLCTimestamp("2025-05-22T12:34:56.789Z|notanumber|node-1")
  ).toBeNull();
  // Invalid date
  expect(parseHLCTimestamp("notadate|00000001|node-1")).toBeNull();
});

Deno.test("HLC: serializeHLC uses correct format", () => {
  // Use a real HLCTimestamp object
  const ts = Date.UTC(2025, 4, 22, 12, 34, 56, 789);
  const hlc = createHLC({ nodeId: "node-xyz", getWallClockTime: () => ts });
  const t = hlc.send();
  const str = serializeHLC(t);
  expect(str).toBe("2025-05-22T12:34:56.789Z|00000001|node-xyz");
});

Deno.test("parseHLCTimestamp returns null for NaN ts or cl", () => {
  expect(parseHLCTimestamp("notadate|00000001|node")).toBeNull();
  expect(
    parseHLCTimestamp("2025-05-22T12:34:56.789Z|notanumber|node")
  ).toBeNull();
});

Deno.test("serializeHLC uses HLCTimestamp.toString cache", () => {
  const ts = Date.UTC(2025, 4, 22, 12, 34, 56, 789);
  const hlc = createHLC({ nodeId: "node-xyz", getWallClockTime: () => ts });
  const t = hlc.send();
  // Call toString twice to check cache
  const s1 = t.toString();
  const s2 = t.toString();
  expect(s1).toBe(s2);
  expect(serializeHLC(t)).toBe(s1);
});
