import { createErreurStore, type TErreurStore } from "@dldc/erreur";

/**
 * Represents the possible error data types for the Hybrid Logical Clock (HLC) operations.
 *
 * @typedef THLCErreurData
 * @property {"ClockDriftOverflow"} kind - Indicates the clock drift has exceeded the allowed maximum.
 * @property {number} maxDrift - The maximum allowed clock drift (for "ClockDriftOverflow").
 * @property {number} drift - The actual clock drift encountered (for "ClockDriftOverflow").
 *
 * @property {"LogicalCounterOverflow"} kind - Indicates the logical counter has exceeded its maximum value.
 * @property {number} max - The maximum allowed value for the logical counter (for "LogicalCounterOverflow").
 * @property {number} current - The current value of the logical counter (for "LogicalCounterOverflow").
 *
 * @property {"TimestampParsingError"} kind - Indicates an error occurred while parsing a timestamp.
 * @property {string} input - The input string that failed to parse (for "TimestampParsingError").
 * @property {string} message - A descriptive error message (for "TimestampParsingError").
 */
export type THLCErreurData =
  | { kind: "ClockDriftOverflow"; maxDrift: number; drift: number }
  | { kind: "LogicalCounterOverflow"; max: number; current: number }
  | { kind: "TimestampParsingError"; input: string; message: string };

const HLCErreurInternal: TErreurStore<THLCErreurData> = createErreurStore<
  THLCErreurData
>();

/**
 * @dldc/erreur store to get error metadata.
 *
 * @example
 * import { HLCErreur } from "@dldc/hybrid-logical-clock";
 *
 * try {
 *   // your code that may throw an HLC error
 * } catch (error) {
 *   const hlcError = HLCErreur.get(error);
 *   //    ^^^^^^^^ null | THLCErreurData
 *   if (hlcError && hlcError.kind === "TimestampParsingError") {
 *     // Handle timestamp parsing error
 *   }
 * }
 */
export const HLCErreur = HLCErreurInternal.asReadonly;

export function throwClockDriftOverflow(
  maxDrift: number,
  drift: number,
): never {
  return HLCErreurInternal.setAndThrow(
    `Drift detected: detected drift of ${drift}ms, which is more than the maximum allowed drift of ${maxDrift}ms`,
    { kind: "ClockDriftOverflow", maxDrift, drift },
  );
}

export function throwLogicalCounterOverflow(
  max: number,
  current: number,
): never {
  return HLCErreurInternal.setAndThrow(
    `Counter overflow: logical counter ${current} has reached its maximum value ${max}`,
    { kind: "LogicalCounterOverflow", max, current },
  );
}

export function throwTimestampParsingError(
  input: string,
  message: string,
): never {
  return HLCErreurInternal.setAndThrow(
    `Cannot parse timestamp "${input}": ${message}`,
    {
      kind: "TimestampParsingError",
      input,
      message,
    },
  );
}
