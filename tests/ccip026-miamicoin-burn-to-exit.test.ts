import { tx } from "@hirosystems/clarinet-sdk";
import { boolCV, principalCV, uintCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { vote } from "./clients/ccip026-miamicoin-burn-to-exit-client";

describe("CCIP026 Core", () => {
  it("should not allow users to execute", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true),
      tx.callPublicFn(
        "ccip026-miamicoin-burn-to-exit",
        "execute",
        [principalCV("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA")],
        "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"
      ),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeErr(uintCV(900)); // unauthorized
  });
});
