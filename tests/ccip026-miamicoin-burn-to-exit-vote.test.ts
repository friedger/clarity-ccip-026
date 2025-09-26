import {
  boolCV,
  ClarityType,
  ResponseCV,
  responseErrorCV,
  responseOkCV,
  SomeCV,
  TupleCV,
  UIntCV,
  uintCV,
} from "@stacks/transactions";
import { describe, expect, it } from "vitest";
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

const checkIsExecutable = (expected: ResponseCV) => {
  const receipt = simnet.callReadOnlyFn(
    "ccip026-miamicoin-burn-to-exit",
    "is-executable",
    [],
    simnet.deployer
  ) as ClarityType;
  expect(receipt.result).toStrictEqual(expected);
};

describe("CCIP026 Vote", () => {
  it("should not allow non-holders or non stackers to vote", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", true), // not a holder
      vote("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", true), // holder of v1
    ]);
    expect(txReceipts[0].result).toBeErr(uintCV(26003));
    expect(txReceipts[1].result).toBeErr(uintCV(26004));
    checkIsExecutable(responseErrorCV(uintCV(26007))); // vote failed
  });

  it("should not allow voting twice with same choice", async () => {
    let txReceipts: any;

    // First vote
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));

    // Try to vote with same choice again
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true),
    ]);
    expect(txReceipts[0].result).toBeErr(uintCV(26002)); // ERR_VOTED_ALREADY
  });

  it("should allow changing vote from yes to no", async () => {
    let txReceipts: any;

    // First vote yes
    txReceipts = simnet.mineBlock([
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    checkVotes(2086372000000n, 1n, 0n, 0n);
    // Change vote to no
    txReceipts = simnet.mineBlock([
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
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
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));

    // check votes
    checkVotes(144479012000000n, 1n, 2086372000000n, 1n);
    checkIsExecutable(responseErrorCV(uintCV(26007))); // vote failed
  });

  it("should count user votes - no-yes", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", false),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));

    // check votes
    checkVotes(2086372000000n, 1n, 144479012000000n, 1n);
    checkIsExecutable(responseErrorCV(uintCV(26007))); // vote failed
  });

  it("should count user votes - yes-yes", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", true),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", true),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));

    // check votes
    checkVotes(146565384000000n, 2n, 0n, 0n);
    checkIsExecutable(responseOkCV(boolCV(true)));
  });

  it("should count user votes - no-no", async () => {
    let txReceipts: any;
    txReceipts = simnet.mineBlock([
      vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", false),
      vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", false),
    ]);
    expect(txReceipts[0].result).toBeOk(boolCV(true));
    expect(txReceipts[1].result).toBeOk(boolCV(true));

    // check votes
    checkVotes(0n, 0n, 146565384000000n, 2n);
    checkIsExecutable(responseErrorCV(uintCV(26007))); // vote failed
  });
});
