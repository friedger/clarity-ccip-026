import { boolCV, tupleCV, uintCV, UIntCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import {
  convertToV2,
  directExecute,
  redeem,
  vote,
} from "./clients/ccd013-burn-to-exit-mia-client";

describe("CCD013 Burn to Exit MIA", () => {
  it("user should redeem at dynamically calculated ratio", async () => {
    expect(simnet.blockHeight).toBe(3491156);

    let txReceipts: any;

    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A"),
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD"), // not a holder
    ]);

    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));
    expect(txReceipts[2].result).toBeErr(uintCV(26003));

    txReceipts = simnet.mineBlock([
      // execute
      directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE"),
      directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ"),
      directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X"),
    ]);

    expect(txReceipts[0].result).toBeOk(uintCV(1));
    expect(txReceipts[1].result).toBeOk(uintCV(2));
    expect(txReceipts[2].result).toBeOk(uintCV(3));

    // Get the dynamically calculated ratio
    const ratioResult = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-redemption-ratio",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );
    const ratio = (ratioResult.result as UIntCV).value;

    // Calculate expected STX amounts based on dynamic ratio
    const miaAmount1 = 321_825_000000n;
    const miaAmount2 = 800_000_000000n;
    const scaleFactor = 1_000000n;
    const expectedStx1 = (miaAmount1 * ratio) / scaleFactor;
    const expectedStx2 = (miaAmount2 * ratio) / scaleFactor;

    txReceipts = simnet.mineBlock([
      // redeem
      redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", Number(miaAmount1)),
      // redeem more than user owns (0 MIA)
      redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", Number(miaAmount1)),
      // redeem holder of v1
      redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", Number(miaAmount2)),
      // convert to v2 (0 MIA)
      convertToV2("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX"),
      // redeem holder again
      redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", Number(miaAmount2)),
    ]);

    // First redemption should succeed with dynamically calculated amount
    expect(txReceipts[0].result).toBeOk(
      tupleCV({
        uStx: uintCV(expectedStx1),
        uMia: uintCV(miaAmount1),
        miaV1: uintCV(0),
        uMiaV2: uintCV(miaAmount1),
      })
    );
    // nothing to redeem (already redeemed all - balance is 0)
    expect(txReceipts[1].result).toBeErr(uintCV(13006)); // ERR_BALANCE_NOT_FOUND
    // redeem v1 holder
    expect(txReceipts[2].result).toBeOk(
      tupleCV({
        uStx: uintCV(expectedStx2),
        uMia: uintCV(miaAmount2),
        miaV1: uintCV(800_000),
        uMiaV2: uintCV(0),
      })
    );
    expect(txReceipts[3].result).toBeErr(uintCV(2003)); // v1 balance not found (0 MIA)
    expect(txReceipts[4].result).toBeErr(uintCV(13006)); // ERR_BALANCE_NOT_FOUND (0 MIA after burn)

    // Verify redemption info is correct
    const redemptionInfo = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-redemption-info",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    // Verify the contract tracked the redemptions correctly
    const totalRedeemed = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-total-redeemed",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );
    expect(totalRedeemed.result).toBeUint(miaAmount1 + miaAmount2);

    const totalTransferred = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-total-transferred",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );
    expect(totalTransferred.result).toBeUint(expectedStx1 + expectedStx2);
  }, 120000);
});
