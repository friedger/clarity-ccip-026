import { describe, expect, it } from "vitest";
import { hexToCV } from "@stacks/transactions";
import { unwrapCv } from "../src/lib/api";

// Real call-read responses from mainnet, verifying that the unwrapper
// produces the flat shape the rest of the UI expects (regression guard
// against @stacks/transactions cvToValue, which wraps every node in
// `{type, value}` envelopes).
describe("unwrapCv", () => {
  it("flattens get-vote-totals shape (optional → tuple → tuple of uints)", () => {
    const hex =
      "0x0a0c00000002036d69610c000000040f746f74616c2d616d6f756e742d6e6f010000000000000000000000000000000010746f74616c2d616d6f756e742d7965730100000000000000000000004c3da8ff000e746f74616c2d766f7465732d6e6f01000000000000000000000000000000000f746f74616c2d766f7465732d796573010000000000000000000000000000000106746f74616c730c000000040f746f74616c2d616d6f756e742d6e6f010000000000000000000000000000000010746f74616c2d616d6f756e742d7965730100000000000000000000004c3da8ff000e746f74616c2d766f7465732d6e6f01000000000000000000000000000000000f746f74616c2d766f7465732d7965730100000000000000000000000000000001";
    const v = unwrapCv(hexToCV(hex)) as {
      mia: { "total-amount-yes": string };
      totals: { "total-amount-yes": string; "total-votes-yes": string };
    };
    expect(v.totals["total-amount-yes"]).toBe("327452000000");
    expect(v.totals["total-votes-yes"]).toBe("1");
    expect(v.mia["total-amount-yes"]).toBe("327452000000");
  });

  it("returns null for OptionalNone", () => {
    // `(optional none)` clarity value
    expect(unwrapCv(hexToCV("0x09"))).toBeNull();
  });
});
