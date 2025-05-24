import { LOGICAL_CLOCK_LENGTH } from "./defaults.ts";
import type { HLCTimestamp } from "./types.ts";

export function createHLCTimestamp(
  ts: number,
  cl: number,
  id: string,
): HLCTimestamp {
  let strCache: string | null = null;

  return {
    ts,
    cl,
    id,
    toString: () => {
      if (strCache) {
        return strCache;
      }
      return (strCache = serialize(ts, cl, id));
    },
  };
}

export function serialize(ts: number, cl: number, id: string): string {
  const dateStr = new Date(ts).toISOString();
  const clStr = cl.toString().padStart(LOGICAL_CLOCK_LENGTH, "0");
  return `${dateStr}|${clStr}|${id}`;
}
