import { Cl, serializeCV } from "@stacks/transactions";
import { POX_4, type FAST_POOL } from "./config";
import { parseStxToUstx } from "./format";
import { callContract, type CallContractResult } from "./wallet";

/**
 * Auto-compound sentinel: 1,000,000,000 STX (1000m STX) in uSTX. Fast Pool
 * treats a delegated amount this large as "stack everything I have, including
 * future rewards" — the protocol only locks up to (balance - 1 STX), so the
 * sentinel never over-allocates.
 */
export const AUTO_COMPOUND_USTX = 1_000_000_000n * 1_000_000n;

/**
 * Fast Pool always subtracts 1 STX from the delegated amount on-chain (kept
 * liquid for the user's tx fees), so the user is allowed to pass their full
 * liquid balance — the contract handles the reserve internally. We expose
 * the constant for the UI hint copy.
 */
export const RESERVE_USTX = 1_000_000n;

export interface FastPoolAmountInputs {
  autoCompound: boolean;
  inputStx: string;
  /** Snapshot of liquid + projected (post-redemption) STX, in uSTX. */
  availableUstx: bigint;
}

export interface FastPoolAmountResult {
  /** Amount to pass to delegate-stx, in uSTX. */
  ustx: bigint;
  /** UI-facing reason if the amount is not actionable. */
  error?: string;
}

/**
 * Pure derivation of the uSTX amount the user is delegating. Auto-compound
 * always wins and ignores the input. Manual mode parses the decimal STX
 * input and rejects out-of-range values up front so the wallet doesn't bounce
 * an obviously bad tx.
 *
 * The upper bound is the full liquid balance — Fast Pool subtracts the 1 STX
 * fee reserve inside the contract.
 */
export function deriveFastPoolAmount(
  args: FastPoolAmountInputs,
): FastPoolAmountResult {
  if (args.autoCompound) {
    return { ustx: AUTO_COMPOUND_USTX };
  }
  const parsed = parseStxToUstx(args.inputStx);
  if (parsed == null) return { ustx: 0n, error: "Enter a valid STX amount." };
  if (parsed === 0n) return { ustx: 0n, error: "Amount must be greater than 0." };
  if (parsed > args.availableUstx) {
    return {
      ustx: parsed,
      error: "Amount exceeds your liquid STX balance.",
    };
  }
  return { ustx: parsed };
}

/**
 * Suggested manual amount: full liquid balance. Fast Pool keeps the 1 STX
 * fee reserve on-chain, so the UI no longer needs to subtract it.
 */
export function recommendedUstx(availableUstx: bigint): bigint {
  return availableUstx;
}

/**
 * Submits `pox-4.allow-contract-caller(poolContract, none)` via the user's
 * wallet. PoX-4 requires the user to grant a wrapper this permission once
 * before the wrapper can call delegate-stx on their behalf — without it,
 * the Fast Pool delegate-stx transaction aborts with
 * `err-stacking-permission-denied`.
 *
 * Pass `none` for `until-burn-ht` so the grant is open-ended (can be revoked
 * later with disallow-contract-caller).
 */
export async function allowContractCaller(
  poolContract: typeof FAST_POOL,
): Promise<CallContractResult> {
  const args = [
    Cl.principal(`${poolContract.address}.${poolContract.name}`),
    Cl.none(),
  ];
  return callContract({
    contract: `${POX_4.address}.${POX_4.name}`,
    functionName: "allow-contract-caller",
    functionArgs: args.map((a) => `0x${serializeCV(a)}`),
    postConditionMode: "deny",
  });
}
