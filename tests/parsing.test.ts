import { expect } from "@std/expect";
import { parseHLCTimestamp, serializeHLC } from "../src/hlc.ts";

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
