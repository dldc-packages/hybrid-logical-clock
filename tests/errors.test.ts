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

Deno.test("Expose error metadata for logical counter error", () => {
  try {
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|not-a-number|node1");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("2023-05-24T12:00:00Z|not-a-number|node1");
      expect(hlcError.message).toBe("Invalid logical counter");
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "2023-05-24T12:00:00Z|not-a-number|node1": Invalid logical counter'
      );
    }
  }
});

Deno.test("Expose error metadata for missing node ID", () => {
  try {
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|1|");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("2023-05-24T12:00:00Z|1|");
      expect(hlcError.message).toBe("Invalid nodeId");
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "2023-05-24T12:00:00Z|1|": Invalid nodeId'
      );
    }
  }
});

Deno.test("Expose error metadata for invalid timestamp (date)", () => {
  try {
    parseHLCTimestampStrict("not-a-date|1|node1");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("not-a-date|1|node1");
      expect(hlcError.message).toBe("Invalid timestamp");
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "not-a-date|1|node1": Invalid timestamp'
      );
    }
  }
});

Deno.test("Expose error metadata for logical counter overflow", () => {
  try {
    // 99999999 is MAX_LOGICAL_CLOCK, so 100000000 should overflow
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|100000000|node1");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("2023-05-24T12:00:00Z|100000000|node1");
      expect(hlcError.message).toBe("Invalid logical counter");
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "2023-05-24T12:00:00Z|100000000|node1": Invalid logical counter'
      );
    }
  }
});

Deno.test("Expose error metadata for negative logical counter", () => {
  try {
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|-1|node1");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("2023-05-24T12:00:00Z|-1|node1");
      expect(hlcError.message).toBe("Invalid logical counter");
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "2023-05-24T12:00:00Z|-1|node1": Invalid logical counter'
      );
    }
  }
});

Deno.test("Expose error metadata for too few parts", () => {
  try {
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|1");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("2023-05-24T12:00:00Z|1");
      expect(hlcError.message).toBe(
        "Invalid format, expected ISO8601|logicalCounter|nodeId"
      );
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "2023-05-24T12:00:00Z|1": Invalid format, expected ISO8601|logicalCounter|nodeId'
      );
    }
  }
});

Deno.test("Expose error metadata for empty string", () => {
  try {
    parseHLCTimestampStrict("");
  } catch (error) {
    const hlcError = HLCErreur.get(error);
    if (hlcError && hlcError.kind === "TimestampParsingError") {
      expect(hlcError.input).toBe("");
      expect(hlcError.message).toBe(
        "Invalid format, expected ISO8601|logicalCounter|nodeId"
      );
      expect((error as Error).message).toBe(
        'Cannot parse timestamp "": Invalid format, expected ISO8601|logicalCounter|nodeId'
      );
    }
  }
});

Deno.test("Expose error metadata for whitespace nodeId", () => {
  try {
    parseHLCTimestampStrict("2023-05-24T12:00:00Z|1| ");
  } catch (error) {
    // This should be valid, as nodeId can be whitespace, so no error expected
    expect(error).toBeUndefined();
  }
});
