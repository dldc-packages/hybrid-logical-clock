import { expect } from "@std/expect";
import { HLCErreur, parseHLCTimestampStrict } from "../mod.ts";

Deno.test("Expose error metadata", () => {
  try {
    parseHLCTimestampStrict("invalid-timestamp");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError) {
      expect(hlcError.kind).toBe("TimestampParsingError");
      expect(hlcError).toEqual({
        kind: "TimestampParsingError",
        input: "invalid-timestamp",
        message: "Invalid format, expected ISO8601|logicalCounter|nodeId",
      });
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "invalid-timestamp": Invalid format, expected ISO8601|logicalCounter|nodeId'
      );
    }
  }
});
