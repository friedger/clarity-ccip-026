import { boolCV, tupleCV, uintCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import {
  convertToV2,
  directExecute,
  redeem,
  vote,
} from "./clients/ccd013-burn-to-exit-mia-client";

describe("CCD013 Burn to Exit MIA", () => {
  it("user should redeem at 1700 STX / 1m MIA", async () => {
    expect(simnet.blockHeight).toBe(3491158);

    let txReceipts: any;

    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A"),
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD"), // not a holder
    ]);

    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));
    expect(txReceipts[2].result).toBeErr(uintCV(24003));

    txReceipts = simnet.mineBlock([
      // execute
      directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE"),
      directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ"),
      directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X"),
    ]);

    expect(txReceipts[0].result).toBeOk(uintCV(1));
    expect(txReceipts[1].result).toBeOk(uintCV(2));
    expect(txReceipts[2].result).toBeOk(uintCV(3));

    txReceipts = simnet.mineBlock([
      // redeem
      redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 321_825_000000),
      // redeem more than user owns (0 MIA)
      redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 321_825_000000),
      // redeem holder of v1
      redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", 800_000_000000),
      // convert to v2 (0 MIA)
      convertToV2("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX"),
      // redeem holder again
      redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", 800_000_000000),
    ]);
    expect(txReceipts[0].result).toBeOk(
      tupleCV({
        uStx: uintCV(547_102500),
        uMia: uintCV(321_825_000000),
        miaV1: uintCV(0),
        uMiaV2: uintCV(321_825_000000),
      })
    );
    // nothing to redeem
    expect(txReceipts[1].result).toBeErr(uintCV(13007));
    // redeem v1 holder
    expect(txReceipts[2].result).toBeOk(
      tupleCV({
        uStx: uintCV(1360_000000),
        uMia: uintCV(800_000_000000),
        miaV1: uintCV(800_000),
        uMiaV2: uintCV(0),
      })
    );
    expect(txReceipts[3].result).toBeErr(uintCV(2003)); // v1 balance not found (0 MIA)
    expect(txReceipts[4].result).toBeErr(uintCV(13007)); // nothing to redeem (0 MIA)
  });
});
