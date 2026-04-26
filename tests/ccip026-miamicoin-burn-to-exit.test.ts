import {
  boolCV,
  principalCV,
  SomeCV,
  tupleCV,
  UIntCV,
  uintCV
} from "@stacks/transactions";
import {
  typedCallPublicFn,
  typedCallReadOnlyFn,
} from "clarity-abitype/clarinet-sdk";
import { describe, expect, it } from "vitest";
import { abiCcip026MiamicoinBurnToExit } from "./abis/abi-ccip026-miamicoin-burn-to-exit";
import { vote } from "./clients/ccip026-miamicoin-burn-to-exit-client";
import { buildMerkleTree, type VoterEntry } from "./merkle-helpers";
import { stackingData } from '../data/stacking-data';
import { scaledVoteFromCycles } from '../data/scaled-vote';

const VOTER_A = "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA";
const VOTER_B = "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A";

const voters: VoterEntry[] = stackingData.map((entry) => ({
  address: entry.address,
  scaledVote: scaledVoteFromCycles(entry.cycle82Stacked, entry.cycle83Stacked),
})).filter(({ scaledVote }) => scaledVote > 0n);

const { proofs } = buildMerkleTree(voters);
const proofA = proofs[voters.findIndex((v) => v.address === VOTER_A)];
const proofB = proofs[voters.findIndex((v) => v.address === VOTER_B)];
const VOTER_A_SCALED = voters.find((v) => v.address === VOTER_A)!.scaledVote;
const VOTER_B_SCALED = voters.find((v) => v.address === VOTER_B)!.scaledVote;

describe("CCIP026 Core", () => {
  it("should not allow users to execute", async () => {
    const voteResult = vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);
    expect(voteResult.result).toEqual({ ok: true });

    const txReceipts = typedCallPublicFn({
      simnet,
      abi: abiCcip026MiamicoinBurnToExit,
      contract: "ccip026-miamicoin-burn-to-exit",
      functionName: "execute",
      functionArgs: ["SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"],
      sender: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
    });
    expect(txReceipts.result).toEqual({error: 900n}); // unauthorized
  });

  it("should return correct proposal info", async () => {
    const proposalInfo = typedCallReadOnlyFn({
      simnet,
      abi: abiCcip026MiamicoinBurnToExit,
      contract: "ccip026-miamicoin-burn-to-exit",
      functionName: "get-proposal-info",
      functionArgs: [],
      sender: "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    });

    expect(proposalInfo.result).toEqual({
      hash: "d73c5d9bbd51f785454e60790b4b6be74d42d63d",
      link: "https://github.com/citycoins/governance/blob/d73c5d9bbd51f785454e60790b4b6be74d42d63d/ccips/ccip-026/ccip-026-miamicoin-burn-to-exit.md",
      name: "MiamiCoin Burn to Exit",
    });
  });

  it("should return correct vote period info", async () => {
    const votePeriod = typedCallReadOnlyFn({
      simnet,
      abi: abiCcip026MiamicoinBurnToExit,
      contract: "ccip026-miamicoin-burn-to-exit",
      functionName: "get-vote-period",
      functionArgs: [],
      sender: "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    });

    expect(votePeriod.result).toEqual(
      {
        "end-block": 945645n,
        length: 2016n,
        "start-block": 943629n,
      },
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

    // Set snapshot root and vote
    vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);

    // Check voter info after voting
    voterInfo = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-voter-info",
      [(userId.result as SomeCV<UIntCV>).value],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );

    expect(voterInfo.result).toBeSome(
      tupleCV({
        mia: uintCV(144479012000000),
        vote: boolCV(true),
      }),
    );
  });

  it("should check if vote is active initially", async () => {
    const isActive = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );

    // Should return (some bool) for ccip015 compatibility
    expect(isActive.result).toBeSome(boolCV(true));
  });

  it("should deactive vote after voting period", async () => {
    const isActive = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );

    expect(isActive.result).toBeSome(boolCV(true));

    // Advance to the end of the voting period
    expect(simnet.blockHeight).toBe(7470590);
    simnet.mineEmptyBlocks(2016);
    expect(simnet.blockHeight).toBe(7472606);

    const isActiveAfter = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );
    expect(isActiveAfter.result).toBeSome(boolCV(true));

    simnet.mineEmptyBlocks(1);

    expect(simnet.blockHeight).toBe(7472607);
    const isActiveAfter2 = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "is-vote-active",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );
    expect(isActiveAfter2.result).toBeSome(boolCV(false));
  });

  it("should return empty vote totals initially", async () => {
    const miaVoteTotals = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-vote-total-mia",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );

    expect(miaVoteTotals.result).toBeNone();
  });
});
