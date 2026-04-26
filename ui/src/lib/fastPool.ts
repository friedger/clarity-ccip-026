import { parseStxToUstx } from "./format";

/**
 * Auto-compound sentinel: 1,000,000,000 STX (1000m STX) in uSTX. Fast Pool
 * treats a delegated amount this large as "stack everything I have, including
 * future rewards" — the protocol only locks up to (balance - reserve), so the
 * sentinel never over-allocates.
 */
export const AUTO_COMPOUND_USTX = 1_000_000_000n * 1_000_000n;

/**
 * Minimum liquid STX kept in the wallet so the user can pay future tx fees.
 * Mirrors the convention shown in the UI ("balance - 1 STX is locked").
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
  if (parsed > recommendedUstx(args.availableUstx)) {
    return {
      ustx: parsed,
      error: "Amount exceeds your liquid STX minus the 1 STX fee reserve.",
    };
  }
  return { ustx: parsed };
}

/** Suggested manual amount: liquid balance minus the fee reserve. */
export function recommendedUstx(availableUstx: bigint): bigint {
  return availableUstx > RESERVE_USTX ? availableUstx - RESERVE_USTX : 0n;
}
