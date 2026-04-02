
// ---------------------------------------------------------------------------
// Stacking data
// ---------------------------------------------------------------------------

/**
 * TODO: Replace with actual stacking data fetched from mainnet.
 *
 * Each entry represents a user's stacking amounts for MIA cycles 82 and 83.
 * These values come from:
 *   (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd007-citycoin-stacking
 *     get-stacker u1 u82 <userId>)
 *   (contract-call? 'SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd007-citycoin-stacking
 *     get-stacker u1 u83 <userId>)
 *
 * The principal is the user's STX address (from ccd003-user-registry).
 * The amounts are in micro-MIA (6 decimal places).
 */
export const stackingData: {
  address: string;
  cycle82Stacked: bigint;
  cycle83Stacked: bigint;
}[] = [
  {
    address: "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
    cycle82Stacked: 144479012000000n,
    cycle83Stacked: 144479012000000n,
  },
  {
    address: "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A",
    cycle82Stacked: 0n,
    cycle83Stacked: 50000000000n,
  },
];