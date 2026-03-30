import {
  boolCV,
  SomeCV,
  TupleCV,
  UIntCV,
  uintCV
} from "@stacks/transactions";
import { typedCallReadOnlyFn } from "clarity-abitype/clarinet-sdk";
import { describe, expect, it } from "vitest";
import { abiCcip026MiamicoinBurnToExit } from "./abis/abi-ccip026-miamicoin-burn-to-exit";
import { vote } from "./clients/ccip026-miamicoin-burn-to-exit-client";

const checkVotes = async (
  totalAmountYes: bigint,
  totalVotesYes: bigint,
  totalAmountNo: bigint,
  totalVotesNo: bigint
) => {
  const result = simnet.getMapEntry(
    "ccip026-miamicoin-burn-to-exit",
    "CityVotes",
    uintCV(1)
  ) as SomeCV<
    TupleCV<{
      totalAmountYes: UIntCV;
      totalAmountNo: UIntCV;
      totalVotesYes: UIntCV;
      totalVotesNo: UIntCV;
    }>
  >;
  expect(result.value.value.totalAmountYes.value).toBe(totalAmountYes);
  expect(result.value.value.totalVotesYes.value).toBe(totalVotesYes);
  expect(result.value.value.totalAmountNo.value).toBe(totalAmountNo);
  expect(result.value.value.totalVotesNo.value).toBe(totalVotesNo);
};

const checkIsExecutable = (response: {ok: boolean} | {error: bigint}) => {
  const receipt = typedCallReadOnlyFn({
    simnet,
    abi: abiCcip026MiamicoinBurnToExit,
    contract: "ccip026-miamicoin-burn-to-exit",
    functionName: "is-executable",
    functionArgs: [],
    sender: simnet.deployer,
  });
  expect(receipt.result).toEqual(response);
};

describe("CCIP026 Vote", () => {
  it("should not allow non-holders or non stackers to vote", async () => {
    let txReceipt = 
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", true); // not a holder
    expect(txReceipt.result).toEqual({error: 26003n});

    txReceipt = vote("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", true); // holder of v1
    expect(txReceipt.result).toEqual({error: 26004n});

    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should not allow voting twice with same choice", async () => {
    // First vote
    let txReceipt = 
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true);
    expect(txReceipt.result).toEqual({ok: true});

    // Try to vote with same choice again
    txReceipt = vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true);
    expect(txReceipt.result).toEqual({error: 26002n}); // ERR_VOTED_ALREADY
  });

  it("should allow changing vote from yes to no", async () => {

    // First vote yes
    let txReceipt = 
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(2086372000000n, 1n, 0n, 0n);
    // Change vote to no
    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(0n, 0n, 2086372000000n, 1n);
  });

  it("should calculate MIA vote amounts correctly", async () => {
    // Test for a known stacker
    const miaVoteScaled = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-mia-vote",
      [uintCV(1), boolCV(true)], // userId 1, scaled
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    const miaVoteUnscaled = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-mia-vote",
      [uintCV(1), boolCV(false)], // userId 1, unscaled
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(miaVoteScaled.result).toBeSome(
      uintCV(4443750000000000000000000000n)
    );
    expect(miaVoteUnscaled.result).toBeSome(uintCV(444375000000));
  });

  it("should count user votes - yes-no", async () => {
    let txReceipt =
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true);
    expect(txReceipt.result).toEqual({ok: true});
    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(144479012000000n, 1n, 2086372000000n, 1n);
    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should count user votes - no-yes", async () => {
    let txReceipt = 
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", false);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(2086372000000n, 1n, 144479012000000n, 1n);
    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should count user votes - yes-yes", async () => {
    let txReceipt = 
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(146565384000000n, 2n, 0n, 0n);
    checkIsExecutable({ok: true});
  });

  it("should count user votes - no-no", async () => {
    let txReceipt = 
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", false);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(0n, 0n, 146565384000000n, 2n);
    checkIsExecutable({error: 26007n}); // vote failed
  });
});
