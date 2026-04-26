import {
  boolCV,
  SomeCV,
  TupleCV,
  tupleCV,
  UIntCV,
  uintCV
} from "@stacks/transactions";
import { typedCallReadOnlyFn } from "clarity-abitype/clarinet-sdk";
import { describe, expect, it } from "vitest";
import { stackingData } from "../data/stacking-data";
import { scaledVoteFromCycles } from "../data/scaled-vote";
import { abiCcip026MiamicoinBurnToExit } from "./abis/abi-ccip026-miamicoin-burn-to-exit";
import { vote } from "./clients/ccip026-miamicoin-burn-to-exit-client";
import { buildMerkleTree, type VoterEntry } from "./merkle-helpers";

const VOTE_SCALE_FACTOR = 10n ** 16n;

const VOTER_A = "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA";
const VOTER_A_SCALED = 144479012000000n * VOTE_SCALE_FACTOR;
const VOTER_B = "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A";
const VOTER_B_SCALED = 2086372000000n * VOTE_SCALE_FACTOR;

const voters: VoterEntry[] = stackingData.map((entry) => ({
  address: entry.address,
  scaledVote: scaledVoteFromCycles(entry.cycle82Stacked, entry.cycle83Stacked),
})).filter(({ scaledVote }) => scaledVote > 0n);

const { proofs } = buildMerkleTree(voters);
const proofA = proofs.find((_, index) => voters[index].address === VOTER_A);
const proofB = proofs.find((_, index) => voters[index].address === VOTER_B);


const checkVotes = async (
  totalAmountYes: bigint,
  totalVotesYes: bigint,
  totalAmountNo: bigint,
  totalVotesNo: bigint
) => {
  const result = simnet.getMapEntry(
    "ccip026-miamicoin-burn-to-exit",
    "city-votes",
    uintCV(1)
  ) as SomeCV<
    TupleCV<{
      'total-amount-yes': UIntCV;
      'total-amount-no': UIntCV;
      'total-votes-yes': UIntCV;
      'total-votes-no': UIntCV;
    }>
  >;
  expect(result.value.value['total-amount-yes'].value).toBe(totalAmountYes);
  expect(result.value.value['total-votes-yes'].value).toBe(totalVotesYes);
  expect(result.value.value['total-amount-no'].value).toBe(totalAmountNo);
  expect(result.value.value['total-votes-no'].value).toBe(totalVotesNo);
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
      vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", true, 0n, [], []); // not in tree
    expect(txReceipt.result).toEqual({error: 26008n}); // ERR_PROOF_INVALID

    txReceipt = vote("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", true, 0n, [], []); // holder of v1
    expect(txReceipt.result).toEqual({error: 26004n});

    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should not allow voting twice with same choice", async () => {
    // First vote
    let txReceipt = 
      vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);
    expect(txReceipt.result).toEqual({ok: true});

    // Try to vote with same choice again (no proof needed, record exists)
    txReceipt = vote(VOTER_A, true, 0n, [], []);
    expect(txReceipt.result).toEqual({error: 26002n}); // ERR_VOTED_ALREADY
  });

  it("should allow changing vote from yes to no", async () => {
    // First vote yes
    let txReceipt = 
      vote(VOTER_B, true, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(2086372000000n, 1n, 0n, 0n);
    // Change vote to no (record exists, proof ignored)
    txReceipt = vote(VOTER_B, false, 0n, [], []);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(0n, 0n, 2086372000000n, 1n);
  });

  it("should store correct vote amounts from Merkle proof", async () => {
    // Vote with known scaled amount
    vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);

    // Check that stored vote amount equals scaledVote / VOTE_SCALE_FACTOR
    const voterInfo = simnet.callReadOnlyFn(
      "ccip026-miamicoin-burn-to-exit",
      "get-voter-info",
      [uintCV(187)], // VOTER_A userId
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R"
    );

    expect(voterInfo.result).toBeSome(
      tupleCV({
        mia: uintCV(144479012000000), // VOTER_A_SCALED / 10^16
        vote: boolCV(true),
      })
    );
  });

  it("should count user votes - yes-no", async () => {
    let txReceipt =
      vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);
    expect(txReceipt.result).toEqual({ok: true});
    txReceipt = vote(VOTER_B, false, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(144479012000000n, 1n, 2086372000000n, 1n);
    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should count user votes - no-yes", async () => {
    let txReceipt = 
      vote(VOTER_A, false, VOTER_A_SCALED, proofA.proof, proofA.positions);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote(VOTER_B, true, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(2086372000000n, 1n, 144479012000000n, 1n);
    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should count user votes - yes-yes", async () => {
    let txReceipt = 
      vote(VOTER_A, true, VOTER_A_SCALED, proofA.proof, proofA.positions);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote(VOTER_B, true, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(146565384000000n, 2n, 0n, 0n);
    checkIsExecutable({ok: true});
  });

  it("should count user votes - no-no", async () => {
    let txReceipt =
      vote(VOTER_A, false, VOTER_A_SCALED, proofA.proof, proofA.positions);
      expect(txReceipt.result).toEqual({ok: true});

    txReceipt = vote(VOTER_B, false, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});

    // check votes
    checkVotes(0n, 0n, 146565384000000n, 2n);
    checkIsExecutable({error: 26007n}); // vote failed
  });

  it("should fail vote with invalid merkle proof", async () => {
    // Use VOTER_B's address to proof voter A
    const badProof = [...proofB.proof];
    const txReceipt = vote(VOTER_A, true, VOTER_A_SCALED, badProof, proofA.positions);
    expect(txReceipt.result).toEqual({error: 26008n}); // ERR_PROOF_INVALID
  });

  it("should fail vote with wrong scaled amount", async () => {
    // Use VOTER_A's proof but with a different amount — leaf won't match
    const wrongAmount = VOTER_A_SCALED + 1n;
    const txReceipt = vote(VOTER_A, true, wrongAmount, proofA.proof, proofA.positions);
    expect(txReceipt.result).toEqual({error: 26008n}); // ERR_PROOF_INVALID
  });

  it("should allow changing vote from no to yes", async () => {
    // First vote no
    let txReceipt =
      vote(VOTER_B, false, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(0n, 0n, 2086372000000n, 1n);

    // Change vote to yes (record exists, proof ignored)
    txReceipt = vote(VOTER_B, true, 0n, [], []);
    expect(txReceipt.result).toEqual({ok: true});
    checkVotes(2086372000000n, 1n, 0n, 0n);
  });
});
