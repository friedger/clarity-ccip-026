/**
 * Canonical voting-power scaling.
 *
 * Mirrors `get-mia-vote` in ccip026-miamicoin-burn-to-exit.clar:
 *
 *   scaledVote = (cycle82Stacked * 10^16 + cycle83Stacked * 10^16) / 2
 *
 * IMPORTANT: scale **before** averaging. Scaling after averaging would lose
 * a half-uMIA when (cycle82 + cycle83) is odd, which produces a different
 * Merkle leaf and breaks the on-chain proof verification.
 *
 * This file is the single source of truth — Node simulations (`simulations/*.ts`)
 * and the browser UI (`ui/src/lib/*`) both import from here so the formula
 * cannot drift.
 */

export const VOTE_SCALE_FACTOR = 10n ** 16n;
export const MIA_ID = 1n;

export function scaledVoteFromCycles(
  cycle82Stacked: bigint,
  cycle83Stacked: bigint,
): bigint {
  return (
    (cycle82Stacked * VOTE_SCALE_FACTOR + cycle83Stacked * VOTE_SCALE_FACTOR) /
    2n
  );
}
