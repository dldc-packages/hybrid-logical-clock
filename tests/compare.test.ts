import { expect } from "@std/expect";
import { compareHLCTimestamps } from "../src/hlc.ts";

Deno.test("HLC: compareHLCTimestamps works", () => {
  const t1 = { ts: 1000, cl: 1, id: "a", toString: () => "" };
  const t2 = { ts: 1000, cl: 2, id: "a", toString: () => "" };
  const t3 = { ts: 2000, cl: 0, id: "a", toString: () => "" };
  expect(compareHLCTimestamps(t1, t2)).toBe(-1);
  expect(compareHLCTimestamps(t2, t1)).toBe(1);
  expect(compareHLCTimestamps(t1, t1)).toBe(0);
  expect(compareHLCTimestamps(t2, t3)).toBe(-1);
  expect(compareHLCTimestamps(t3, t2)).toBe(1);
});

Deno.test("compareHLCTimestamps returns 0 for equal", () => {
  const t = { ts: 1, cl: 2, id: "a", toString: () => "" };
  expect(compareHLCTimestamps(t, t)).toBe(0);
});

Deno.test("compareHLCTimestamps returns -1/1 for ts and cl", () => {
  const t1 = { ts: 1, cl: 2, id: "a", toString: () => "" };
  const t2 = { ts: 2, cl: 2, id: "a", toString: () => "" };
  const t3 = { ts: 1, cl: 3, id: "a", toString: () => "" };
  expect(compareHLCTimestamps(t1, t2)).toBe(-1);
  expect(compareHLCTimestamps(t2, t1)).toBe(1);
  expect(compareHLCTimestamps(t1, t3)).toBe(-1);
  expect(compareHLCTimestamps(t3, t1)).toBe(1);
});
