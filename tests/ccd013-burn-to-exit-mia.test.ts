import { boolCV, tupleCV, uintCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import {
  convertToV2,
  directExecute,
  redeem,
  vote,
} from "./clients/ccd013-burn-to-exit-mia-client";
import { tx } from "@stacks/clarinet-sdk";

describe("CCD013 Burn to Exit MIA", () => {
  it("user should redeem at 1700 STX / 1m MIA", async () => {
    expect(simnet.blockHeight).toBe(3491157);

    let txReceipt = vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA");
    expect(txReceipt.result).toEqual({ ok: true });

    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A");
    expect(txReceipt.result).toEqual({ ok: true });

    txReceipt = vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD"); // not a holder
    expect(txReceipt.result).toEqual({ error: 26003n });

    // execute
    let txReceiptDirectExecute = directExecute(
      "SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE",
    );
    expect(txReceiptDirectExecute.result).toEqual({ ok: 1n });
    txReceiptDirectExecute = directExecute(
      "SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ",
    );
    expect(txReceiptDirectExecute.result).toEqual({ ok: 2n });
    txReceiptDirectExecute = directExecute(
      "SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X",
    );
    expect(txReceiptDirectExecute.result).toEqual({ ok: 3n });

    // redeem
    let txReceiptRedeem = redeem(
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
      321_825_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({
      ok: {
        uStx: 547_102500n,
        uMia: 321_825_000000n,
        miaV1: 0n,
        uMiaV2: 321_825_000000n,
      },
    });
    // redeem more than user owns (0 MIA)
    txReceiptRedeem = redeem(
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
      321_825_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({ error: 13007n });
    // redeem holder of v1
    txReceiptRedeem = redeem(
      "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX",
      800_000_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({
      ok: {
        uStx: 1360_000000n,
        uMia: 800_000_000000n,
        miaV1: 800_000n,
        uMiaV2: 0n,
      },
    });
    // convert to v2 (0 MIA)
    const txReceipts= simnet.mineBlock([
      convertToV2("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX"),
    ]);
    expect(txReceipts[0].result).toBeErr(uintCV(2003)); // v1 balance not found (0 MIA)

    // redeem holder again
    ((txReceiptRedeem = redeem(
      "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX",
      800_000_000000n,
    )),
      expect(txReceiptRedeem.result).toEqual({ error: 13007n })); // nothing to redeem (0 MIA)
  }, 120000);
});
