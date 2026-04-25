import { tx } from "@stacks/clarinet-sdk";
import { Cl, uintCV } from "@stacks/transactions";
import { typedCallReadOnlyFn } from "clarity-abitype/clarinet-sdk";
import { describe, expect, it } from "vitest";
import { stackingData } from "../data/stacking-data";
import { calculateScaledMiaVote } from "../simulations/calculate-mia-votes";
import { abiCcd013BurnToExitMia } from "./abis/abi-ccd013-burn-to-exit-mia";
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
import { buildMerkleTree, type VoterEntry } from "./merkle-helpers";

const VOTER_A = "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA";
const VOTER_B = "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A";

const voters: VoterEntry[] = stackingData
  .map((entry) => ({
    address: entry.address,
    scaledVote: calculateScaledMiaVote(
      entry.cycle82Stacked,
      entry.cycle83Stacked,
    ),
  }))
  .filter(({ scaledVote }) => scaledVote > 0n);
const { root, proofs } = buildMerkleTree(voters);
const proofA = proofs[voters.findIndex((v) => v.address === VOTER_A)];
const proofB = proofs[voters.findIndex((v) => v.address === VOTER_B)];
const VOTER_A_SCALED = voters.find((v) => v.address === VOTER_A)!.scaledVote;
const VOTER_B_SCALED = voters.find((v) => v.address === VOTER_B)!.scaledVote;

/** Vote and execute the proposal, enabling redemptions. */
function setupVoteAndExecute() {
  vote(VOTER_A, VOTER_A_SCALED, proofA.proof, proofA.positions);
  vote(VOTER_B, VOTER_B_SCALED, proofB.proof, proofB.positions);
  directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE");
  directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ");
  directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X");
}

describe("CCD013 Burn to Exit MIA", () => {
  it("should correctly round v1 burn amount", () => {
    setupVoteAndExecute();

    // Transfer 5 v1 tokens from a large v1 holder to a fresh address
    const v1Holder = "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX";
    const recipient = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R";
    const transferReceipts = simnet.mineBlock([
      tx.callPublicFn(
        "SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token",
        "transfer",
        [
          Cl.uint(5),
          Cl.principal(v1Holder),
          Cl.principal(recipient),
          Cl.none(),
        ],
        v1Holder,
      ),
    ]);
    expect(transferReceipts[0].result).toBeOk(Cl.bool(true));

    // Redeem 3,500,000 micro-MIA (3.5 MIA) — NOT a clean multiple of 10^6
    // The recipient has 5 v1 tokens (= 5,000,000 micro-MIA equivalent), 0 v2.
    //
    // v1 burn path:
    //   redemptionAmountUMiaV1 = min(3_500_000, 5_000_000) = 3_500_000
    //   redemptionV1InMia = floor(3_500_000 / 1_000_000) = 3 whole tokens
    //   Actually burned: 3 v1 tokens = 3_000_000 micro-MIA
    //
    // Invalid through rounding: redemptionTotalUMia = 3_500_000
    //   → STX paid for 500_000 phantom micro-MIA that were never burned
    //   → uStx = (3_500_000 * 5) / 1_000_000 = 17
    //
    // Valid amount: redemptionTotalUMia = 3 * 1_000_000 = 3_000_000
    //   → matches actual v1 burn, no overpayment
    //   → uStx = (3_000_000 * 5) / 1_000_000 = 15

    const txReceiptRedeemInvalid = redeem(recipient, 3_500_000n);
    expect(txReceiptRedeemInvalid.result).toEqual({ error: 13010n }); // ERR_INVALID_REDEMPTION_AMOUNT

    const txReceiptRedeem = redeem(recipient, 3_000_000n);
    const ratio = 1710n;
    const scaleFactor = 1_000_000n;
    const actualBurnedUMia = 3_000_000n; // 3 whole v1 tokens
    const expectedStx = (actualBurnedUMia * ratio) / scaleFactor; // 15

    expect(txReceiptRedeem.result).toEqual({
      ok: {
        ustx: expectedStx, // 15 uSTX (old bug: 17)
        umia: actualBurnedUMia, // 3_000_000 (old bug: 3_500_000)
        "mia-v1": 3n, // 3 whole v1 tokens burned
        "umia-v2": 0n,
      },
    });
  });

  it("user should redeem at dynamically calculated ratio", async () => {
    let txReceipt = vote(
      VOTER_A,
      VOTER_A_SCALED,
      proofA.proof,
      proofA.positions,
    );
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
    expect(ratio).toBe(1710n);

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
        ustx: expectedStx1,
        umia: 321_825_000000n,
        "mia-v1": 0n,
        "umia-v2": 321_825_000000n,
      },
    });
    // redeem more than user owns (0 MIA)
    txReceiptRedeem = redeem(
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
      321_825_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({ error: 13008n }); // ERR_ZERO_BALANCE
    // redeem holder of v1
    txReceiptRedeem = redeem(
      "SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX",
      800_000_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({
      ok: {
        ustx: expectedStx2,
        umia: 800_000_000000n,
        "mia-v1": 800_000n,
        "umia-v2": 0n,
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
      expect(txReceiptRedeem.result).toEqual({ error: 13008n })); // ERR_ZERO_BALANCE (0 MIA)

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
    setupVoteAndExecute();
    const result = isRedemptionEnabled(
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
    );
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
        "balance-v1-mia": 0n,
        "balance-v2-umia": 321825000000n,
        "total-balance-umia": 321825000000n,
      },
    });
  });

  it("should return correct user redemption info before initialization", () => {
    const miaAmount1 = 321_825_000000n;
    const result = getUserRedemptionInfo(
      "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
    );
    expect(result.result).toEqual({
      ok: {
        address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
        "burn-amount-umia": 0n,
        "burn-amount-v1-mia": 0n,
        "burn-amount-v2-umia": 0n,
        "mia-balances": {
          address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
          "balance-v1-mia": 0n,
          "balance-v2-umia": miaAmount1,
          "total-balance-umia": miaAmount1,
        },
        "redemption-amount-ustx": 0n,
        "redemption-claims": {
          umia: 0n,
          ustx: 0n,
        },
      },
    });
  });

  it("should track contract balance decrease after redemptions", () => {
    setupVoteAndExecute();
    const infoBefore = getRedemptionInfo().result;
    redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 321_825_000000n);
    const info = getRedemptionInfo().result;
    // currentContractBalance should be less than the initial contractBalance
    expect(info["current-contract-balance"]).toBeLessThan(
      infoBefore["current-contract-balance"],
    );
    expect(info["total-transferred"]).toBe(
      (321_825_000000n * 1710n) / 1_000_000n,
    ); // amount redeemed * ratio
    // The difference should equal totalTransferred
    expect(info["current-contract-balance"]).toBe(
      infoBefore["current-contract-balance"] - info["total-transferred"],
    );
    expect(info["mining-treasury-ustx"]).toBe(10241497066794n);
    expect(infoBefore["current-contract-balance"]).toBe(44049273345n);
  });

  it("should return complete redemption info", () => {
    setupVoteAndExecute();
    redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 321_825_000000n);
    const info = getRedemptionInfo();
    const result = info.result;
    expect(result["redemption-enabled"]).toBe(true);
    expect(result["redemption-ratio"]).toBe(1710n);
    expect(result["total-supply"]).toBeGreaterThan(0n);
    expect(result["mining-treasury-ustx"]).toBe(10241497066794n);
    expect(result["block-height"]).toBeGreaterThan(0n);
    expect(result["total-redeemed"]).toBe(321825000000n);
    expect(result["total-transferred"]).toBe(550320750n);
  });

  it("should return complete redemption info if redeemed more than max per tx", () => {
    setupVoteAndExecute();
    redeem("SP3HXJJMJQ06GNAZ8XWDN1QM48JEDC6PP6W3YZPZJ", 1_646_111_611_749416n);
    const info = getRedemptionInfo();
    const result = info.result;
    expect(result["redemption-enabled"]).toBe(true);
    expect(result["redemption-ratio"]).toBe(1710n);
    expect(result["total-supply"]).toBeGreaterThan(0n);
    expect(result["mining-treasury-ustx"]).toBe(10241497066794n);
    expect(result["block-height"]).toBeGreaterThan(0n);
    expect(result["total-redeemed"]).toBe(10000000000000n); // capped at 10m MIA
    expect(result["total-transferred"]).toBe(17100000000n);
  });

  it("should return complete redemption info if redeemed more than in contract", () => {
    setupVoteAndExecute();
    redeem("SP3HXJJMJQ06GNAZ8XWDN1QM48JEDC6PP6W3YZPZJ", 1_646_111_611_749416n); // 10m MIA
    redeem("SP3HXJJMJQ06GNAZ8XWDN1QM48JEDC6PP6W3YZPZJ", 1_646_111_611_749416n); // 10m MIA
    redeem("SP3HXJJMJQ06GNAZ8XWDN1QM48JEDC6PP6W3YZPZJ", 1_646_111_611_749416n); // 5.7m MIA
    const info = getRedemptionInfo();
    const result = info.result;
    expect(result["redemption-enabled"]).toBe(true);
    expect(result["redemption-ratio"]).toBe(1710n);
    expect(result["total-supply"]).toBeGreaterThan(0n);
    expect(result["mining-treasury-ustx"]).toBe(10241497066794n);
    expect(result["block-height"]).toBeGreaterThan(0n);
    expect(result["total-redeemed"]).toBe(25759808973684n); // capped at 10m MIA
    expect(result["total-transferred"]).toBe(44049273345n); // total balance
  });

  it("should return error when redeeming before initialization", () => {
    const txReceiptRedeem = redeem(
      "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
      321_825_000000n,
    );
    expect(txReceiptRedeem.result).toEqual({ error: 13005n }); // ERR_NOT_ENABLED
  })

  it("should return error when executing twice", () => {
    setupVoteAndExecute();
    const txReceiptDirectExecute = directExecute(
      "SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE",
    );
    expect(txReceiptDirectExecute.result).toEqual({ error: 901 }); // ERR_ALREADY_EXECUTED
  });

  it("should return error when voting with invalid proof", () => {
    const txReceipt = vote(
      "SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD",
      0n,
      [],
      [],
    );
    expect(txReceipt.result).toEqual({ error: 26008n }); // ERR_BALANCE_NOT_FOUND
  });
});
