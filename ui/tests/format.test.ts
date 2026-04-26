import { describe, expect, it } from "vitest";
import {
  formatUMia,
  formatUStx,
  formatUstxAsStxInput,
  miaFromUmia,
  parseStxToUstx,
  shortAddress,
} from "../src/lib/format";

describe("formatUStx", () => {
  it("formats whole STX with 2 decimals by default", () => {
    expect(formatUStx(1_000_000n)).toBe("1.00");
    expect(formatUStx(1_500_000n)).toBe("1.50");
  });

  it("formats large amounts with thousands separators", () => {
    expect(formatUStx(123_456_789_000n)).toBe("123,456.78");
  });

  it("truncates extra precision (does not round)", () => {
    expect(formatUStx(1_999_999n, 2)).toBe("1.99");
  });

  it("supports zero fraction digits", () => {
    expect(formatUStx(1_000_000n, 0)).toBe("1");
  });
});

describe("formatUMia", () => {
  it("formats uMIA into MIA with thousands separators", () => {
    expect(formatUMia(1_000_000n, 0)).toBe("1");
    expect(formatUMia(10_000_000_000n, 0)).toBe("10,000");
  });
});

describe("miaFromUmia", () => {
  it("floors uMIA to whole MIA", () => {
    expect(miaFromUmia(1_999_999n)).toBe(1n);
    expect(miaFromUmia(2_000_000n)).toBe(2n);
  });
});

describe("parseStxToUstx", () => {
  it("parses whole STX", () => {
    expect(parseStxToUstx("10")).toBe(10_000_000n);
  });
  it("parses fractional STX up to 6 decimals", () => {
    expect(parseStxToUstx("0.5")).toBe(500_000n);
    expect(parseStxToUstx("1.234567")).toBe(1_234_567n);
  });
  it("strips commas and trims", () => {
    expect(parseStxToUstx(" 1,000.50 ")).toBe(1_000_500_000n);
  });
  it("rejects more than 6 fractional digits", () => {
    expect(parseStxToUstx("1.1234567")).toBeNull();
  });
  it("rejects non-numeric input", () => {
    expect(parseStxToUstx("abc")).toBeNull();
    expect(parseStxToUstx("")).toBeNull();
  });
});

describe("formatUstxAsStxInput", () => {
  it("formats without thousands separators and trims trailing zeros", () => {
    expect(formatUstxAsStxInput(10_000_000n)).toBe("10");
    expect(formatUstxAsStxInput(10_500_000n)).toBe("10.5");
    expect(formatUstxAsStxInput(10_000_001n)).toBe("10.000001");
  });
  it("returns 0 for non-positive input", () => {
    expect(formatUstxAsStxInput(0n)).toBe("0");
    expect(formatUstxAsStxInput(-5n)).toBe("0");
  });
});

describe("shortAddress", () => {
  it("returns the same string when shorter than head+tail", () => {
    expect(shortAddress("ABC", 5, 4)).toBe("ABC");
  });

  it("collapses long Stacks addresses", () => {
    const a = "SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27";
    expect(shortAddress(a)).toBe("SP466…KP27");
  });

  it("returns empty for empty input", () => {
    expect(shortAddress("")).toBe("");
  });
});
