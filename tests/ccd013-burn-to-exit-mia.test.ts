import { describe, expect, it } from "vitest";
import { directExecute, vote } from "./clients/ccd013-burn-to-exit-mia-client";
import { boolCV, uintCV } from "@stacks/transactions";
import { Simnet } from "@hirosystems/clarinet-sdk";

describe("CCD013 Burn to Exit MIA", () => {
  it("user should redeem at 1700 STX / 1m MIA", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"),
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD"),
      vote("SP34N5WWPHWTVJVYPE368HYDEXMZWKPVF639B3P5T"),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A"),
    ]);

    console.log(txReceipts);

    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeErr(uintCV(24003));
    expect(txReceipts[2].result).toBeErr(uintCV(24003));
    expect(txReceipts[3].result).toBeOk(boolCV(true));

    txReceipts = simnet.mineBlock([
      // execute
      directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE"),
      directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ"),
      directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X"),
      // // redeem
      // redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",  321_825_000000),
      // // redeem more than user owns (0 MIA)
      // redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 321_825_000000),
    ]);

    console.log(txReceipts);

    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));
    expect(txReceipts[2].result).toBeOk(boolCV(true));
  });
});
