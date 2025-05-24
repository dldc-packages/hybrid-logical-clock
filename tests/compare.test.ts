import { expect } from "@std/expect";
import { compareHLCTimestamps } from "../src/hlc.ts";
import { createHLCTimestamp } from "../src/internal.ts";

Deno.test("HLC: compareHLCTimestamps works", () => {
  const t1 = createHLCTimestamp(1000, 1, "a");
  const t2 = createHLCTimestamp(1000, 2, "a");
  const t3 = createHLCTimestamp(2000, 0, "a");
  expect(compareHLCTimestamps(t1, t2)).toBe(-1);
  expect(compareHLCTimestamps(t2, t1)).toBe(1);
  expect(compareHLCTimestamps(t1, t1)).toBe(0);
  expect(compareHLCTimestamps(t2, t3)).toBe(-1);
  expect(compareHLCTimestamps(t3, t2)).toBe(1);
});

Deno.test("compareHLCTimestamps returns 0 for equal", () => {
  const t = createHLCTimestamp(1, 2, "a");
  expect(compareHLCTimestamps(t, t)).toBe(0);
});

Deno.test("compareHLCTimestamps returns -1/1 for ts and cl", () => {
  const t1 = createHLCTimestamp(1, 2, "a");
  const t2 = createHLCTimestamp(2, 2, "a");
  const t3 = createHLCTimestamp(1, 3, "a");
  expect(compareHLCTimestamps(t1, t2)).toBe(-1);
  expect(compareHLCTimestamps(t2, t1)).toBe(1);
  expect(compareHLCTimestamps(t1, t3)).toBe(-1);
  expect(compareHLCTimestamps(t3, t1)).toBe(1);
});
