import { createErreurStore, type TErreurStore } from "@dldc/erreur";

export type THLCErreurData =
  | { kind: "ClockDriftOverflow"; maxDrift: number; drift: number }
  | { kind: "LogicalCounterOverflow"; max: number; current: number }
  | { kind: "TimestampParsingError"; input: string; message: string };

const HLCErreurInternal: TErreurStore<THLCErreurData> =
  createErreurStore<THLCErreurData>();

export const HLCErreur = HLCErreurInternal.asReadonly;

export function throwClockDriftOverflow(
  maxDrift: number,
  drift: number
): never {
  return HLCErreurInternal.setAndThrow(
    `Drift detected: detected drift of ${drift}ms, which is more than the maximum allowed drift of ${maxDrift}ms`,
    { kind: "ClockDriftOverflow", maxDrift, drift }
  );
}

export function throwLogicalCounterOverflow(
  max: number,
  current: number
): never {
  return HLCErreurInternal.setAndThrow(
    `Counter overflow: logical counter ${current} has reached its maximum value ${max}`,
    { kind: "LogicalCounterOverflow", max, current }
  );
}

export function throwTimestampParsingError(
  input: string,
  message: string
): never {
  return HLCErreurInternal.setAndThrow(
    `Cannot parse timestamp "${input}": ${message}`,
    {
      kind: "TimestampParsingError",
      input,
      message,
    }
  );
}
