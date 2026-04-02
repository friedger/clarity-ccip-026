import { uintCV } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import {
  convertToV2,
  directExecute,
  getMiaBalances,
  getRedemptionInfo,
  getUserRedemptionInfo,
  isRedemptionEnabled,
  redeem,
  vote,
} from "./clients/ccd013-burn-to-exit-mia-client";
import { setSnapshotRoot } from "./clients/ccip026-miamicoin-burn-to-exit-client";
import { typedCallReadOnlyFn } from "clarity-abitype/clarinet-sdk";
import { abiCcd013BurnToExitMia } from "./abis/abi-ccd013-burn-to-exit-mia";
import { buildMerkleTree, type VoterEntry } from "./merkle-helpers";

const VOTE_SCALE_FACTOR = 10n ** 16n;

const VOTER_A = "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA";
const VOTER_A_SCALED = 144479012000000n * VOTE_SCALE_FACTOR;
const VOTER_B = "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A";
const VOTER_B_SCALED = 50000000000n * VOTE_SCALE_FACTOR;

const voters: VoterEntry[] = [
  { address: VOTER_A, scaledVote: VOTER_A_SCALED },
  { address: VOTER_B, scaledVote: VOTER_B_SCALED },
];

const { root, proofs } = buildMerkleTree(voters);
const [proofA, proofB] = proofs;

describe("CCD013 Burn to Exit MIA", () => {
  it("user should redeem at dynamically calculated ratio", async () => {

    // Set snapshot root before voting
    const rootResult = setSnapshotRoot("SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R", root);
    expect(rootResult.result).toEqual({ ok: true });

    let txReceipt = vote(VOTER_A, VOTER_A_SCALED, proofA.proof, proofA.positions);
    expect(txReceipt.result).toEqual({ ok: true });

    txReceipt = vote(VOTER_B, VOTER_B_SCALED, proofB.proof, proofB.positions);
    expect(txReceipt.result).toEqual({ ok: true });

    txReceipt = vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", 0n, [], []); // not in tree
    expect(txReceipt.result).toEqual({ error: 26008n }); // ERR_BALANCE_NOT_FOUND

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

    // Get the dynamically calculated ratio
    const ratioResult = typedCallReadOnlyFn({
      simnet,
      abi: abiCcd013BurnToExitMia,
      contract: "ccd013-burn-to-exit-mia",
      functionName: "get-redemption-ratio",
      functionArgs: [],
      sender: "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    });
    const ratio = ratioResult.result;
    expect(ratio).toBe(5n); 

    // Calculate expected STX amounts based on dynamic ratio
    const miaAmount1 = 321_825_000000n;
    const miaAmount2 = 800_000_000000n;
    const scaleFactor = 1_000000n;
    const expectedStx1 = (miaAmount1 * ratio) / scaleFactor;
    const expectedStx2 = (miaAmount2 * ratio) / scaleFactor;

    // redeem
    let txReceiptRedeem = redeem(
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
      321_825_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({
      ok: {
        uStx: expectedStx1,
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
    expect(txReceiptRedeem.result).toEqual({ error: 13006n });
    // redeem holder of v1
    txReceiptRedeem = redeem(
      "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX",
      800_000_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({
      ok: {
        uStx: expectedStx2,
        uMia: 800_000_000000n,
        miaV1: 800_000n,
        uMiaV2: 0n,
      },
    });
    // convert to v2 (0 MIA)
    const txReceipts = simnet.mineBlock([
      convertToV2("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX"),
    ]);
    expect(txReceipts[0].result).toBeErr(uintCV(2003)); // v1 balance not found (0 MIA)

    // redeem holder again
    ((txReceiptRedeem = redeem(
      "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX",
      800_000_000000n,
    )),
      expect(txReceiptRedeem.result).toEqual({ error: 13006n })); // nothing to redeem (0 MIA)

    // Verify redemption info is correct
    const redemptionInfo = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-redemption-info",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );

    // Verify the contract tracked the redemptions correctly
    const totalRedeemed = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-total-redeemed",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );
    expect(totalRedeemed.result).toBeUint(miaAmount1 + miaAmount2);

    const totalTransferred = simnet.callReadOnlyFn(
      "ccd013-burn-to-exit-mia",
      "get-total-transferred",
      [],
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );
    expect(totalTransferred.result).toBeUint(expectedStx1 + expectedStx2);
  });

  it("should report redemption as enabled after initialization", () => {
    const result = isRedemptionEnabled("SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R");
    expect(result.result).toBe(true);
  });

  it("should return correct MIA balances for a known address", () => {
    // SP39EH... redeemed all their v2 in the happy path, so balance should be 0
    const result = getMiaBalances(
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
    );
    expect(result.result).toEqual({
      ok: {
        address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
        balanceV1: 0n,
        "balanceV2": 321825000000n,
        "totalBalance": 321825000000n,
      },
    });
  });

  it("should return correct user redemption info after redeem", () => {
    const ratio = 5n;
    const scaleFactor = 1_000000n;
    const miaAmount1 = 321_825_000000n;
    const expectedStx1 = (miaAmount1 * ratio) / scaleFactor;

    const result = getUserRedemptionInfo(
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
    );
    expect(result.result).toEqual({
      ok: {
        address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
        miaBalances: {
          address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
          balanceV1: 0n,
          balanceV2: miaAmount1,
          totalBalance: miaAmount1,
        },
        redemptionAmount: 0n,
        redemptionClaims: {
          uMia: 0n,
          uStx: 0n,
        },
      },
    });
  });

  it("should track treasury balance decrease after redemptions", () => {
    const info = getRedemptionInfo("SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R");
    const result = info.result;
    // currentContractBalance should be less than the initial contractBalance
    expect(result.currentContractBalance).toBeLessThan(result.contractBalance);
    // The difference should equal totalTransferred
    expect(result.contractBalance - result.currentContractBalance).toBe(
      result.totalTransferred,
    );
  });

  it("should return complete redemption info", () => {
    const info = getRedemptionInfo("SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R");
    const result = info.result;
    expect(result.redemptionsEnabled).toBe(true);
    expect(result.redemptionRatio).toBe(5n);
    expect(result.totalSupply).toBeGreaterThan(0n);
    expect(result.contractBalance).toBeGreaterThan(0n);
    expect(result.blockHeight).toBeGreaterThan(0n);
    expect(result.totalRedeemed).toBeGreaterThan(0n);
    expect(result.totalTransferred).toBeGreaterThan(0n);
  });
});

