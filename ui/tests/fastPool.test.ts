import { describe, expect, it } from "vitest";
import {
  AUTO_COMPOUND_USTX,
  RESERVE_USTX,
  deriveFastPoolAmount,
  recommendedUstx,
} from "../src/lib/fastPool";

describe("AUTO_COMPOUND_USTX", () => {
  it("equals 1,000,000,000 STX in micro-units", () => {
    expect(AUTO_COMPOUND_USTX).toBe(1_000_000_000n * 1_000_000n);
  });
});

describe("recommendedUstx", () => {
  it("subtracts the 1 STX fee reserve", () => {
    expect(recommendedUstx(10_000_000n)).toBe(10_000_000n - RESERVE_USTX);
  });

  it("returns 0 when balance is below the reserve", () => {
    expect(recommendedUstx(0n)).toBe(0n);
    expect(recommendedUstx(500_000n)).toBe(0n);
    expect(recommendedUstx(RESERVE_USTX)).toBe(0n);
  });
});

describe("deriveFastPoolAmount", () => {
  it("auto-compound returns the sentinel regardless of input", () => {
    const out = deriveFastPoolAmount({
      autoCompound: true,
      inputStx: "garbage",
      availableUstx: 0n,
    });
    expect(out.ustx).toBe(AUTO_COMPOUND_USTX);
    expect(out.error).toBeUndefined();
  });

  it("manual mode parses a decimal STX input into uSTX", () => {
    const out = deriveFastPoolAmount({
      autoCompound: false,
      inputStx: "10.5",
      availableUstx: 100_000_000n,
    });
    expect(out.ustx).toBe(10_500_000n);
    expect(out.error).toBeUndefined();
  });

  it("manual mode rejects empty input", () => {
    const out = deriveFastPoolAmount({
      autoCompound: false,
      inputStx: "",
      availableUstx: 100_000_000n,
    });
    expect(out.ustx).toBe(0n);
    expect(out.error).toMatch(/valid STX/i);
  });

  it("manual mode rejects zero", () => {
    const out = deriveFastPoolAmount({
      autoCompound: false,
      inputStx: "0",
      availableUstx: 100_000_000n,
    });
    expect(out.error).toMatch(/greater than 0/i);
  });

  it("flags amounts above (balance - 1 STX)", () => {
    const out = deriveFastPoolAmount({
      autoCompound: false,
      inputStx: "100",
      availableUstx: 50_000_000n, // 50 STX, recommended max = 49 STX
    });
    expect(out.error).toMatch(/exceeds/i);
    expect(out.ustx).toBe(100_000_000n); // value still echoed for transparency
  });

  it("accepts the exact recommended max", () => {
    const out = deriveFastPoolAmount({
      autoCompound: false,
      inputStx: "49",
      availableUstx: 50_000_000n,
    });
    expect(out.ustx).toBe(49_000_000n);
    expect(out.error).toBeUndefined();
  });
});
