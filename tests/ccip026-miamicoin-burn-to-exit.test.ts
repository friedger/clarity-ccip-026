import { tx } from "@hirosystems/clarinet-sdk";
import {
  boolCV,
  noneCV,
  principalCV,
  SomeCV,
  stringAsciiCV,
  tupleCV,
  UIntCV,
  uintCV,
} from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { vote } from "./clients/ccip026-miamicoin-burn-to-exit-client";
import { stringAscii } from "@stacks/transactions/dist/cl";
import { U } from "vitest/dist/chunks/environment.d.cL3nLXbE.js";

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

  it("should return correct proposal info", async () => {
    const proposalInfo = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-proposal-info",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(proposalInfo.result).toBeSome(
      tupleCV({
        hash: stringAsciiCV(""),
        link: stringAsciiCV(
          "https://github.com/citycoins/governance/blob/eea941ea40c16428b4806d1808e7dab9fc095e0a/ccips/ccip-026/ccip-026-miamicoin-burn-to-exit.md"
        ),
        name: stringAsciiCV("MiamiCoin Burn to Exit"),
      })
    );
  });

  it("should return correct vote period info", async () => {
    const votePeriod = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-vote-period",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(votePeriod.result).toBeSome(
      tupleCV({
        endBlock: uintCV(916481),
        length: uintCV(2016),
        startBlock: uintCV(914465),
      })
    );
  });

  it("should return voter info after voting", async () => {
    // Get user ID first
    const userId = simnet.callReadOnlyFn(
      "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd003-user-registry",
      "get-user-id",
      [principalCV("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA")],
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"
    );
    expect(userId.result).toBeSome(uintCV(187));

    // Check voter info before voting
    let voterInfo = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-voter-info",
      [(userId.result as SomeCV<UIntCV>).value],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(voterInfo.result).toBeNone();

    // Vote
    simnet.mineBlock([vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true)]);

    // Check voter info after voting
    voterInfo = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-voter-info",
      [(userId.result as SomeCV<UIntCV>).value],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(voterInfo.result).toBeSome(
      tupleCV({
        mia: uintCV(144479012000000),
        vote: boolCV(true),
      })
    );
  });

  it("should check if vote is active initially", async () => {
    const isActive = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    // Should return a boolean
    expect(isActive.result).toBeBool(true);
  });

  it("should deactive vote after voting period", async () => {
    const isActive = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(isActive.result).toBeBool(true);

    // Advance to the end of the voting period
    expect(simnet.blockHeight).toBe(3491156);
    simnet.mineEmptyBlocks(2016);
    expect(simnet.blockHeight).toBe(3493172);

    const isActiveAfter = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );
    expect(isActiveAfter.result).toBeBool(true);

    simnet.mineEmptyBlocks(1);

    expect(simnet.blockHeight).toBe(3493173);
    const isActiveAfter2 = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );
    expect(isActiveAfter2.result).toBeBool(false);
  });

  it("should return empty vote totals initially", async () => {
    const miaVoteTotals = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-vote-total-mia",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(miaVoteTotals.result).toBeNone();
  });
});
