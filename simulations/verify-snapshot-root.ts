/**
 * Verify that the Merkle root committed in
 * contracts/ccip026-miamicoin-burn-to-exit.clar matches the root recomputed
 * from data/stacking-data.ts.
 *
 * Run before every (re)deploy of CCIP-026:
 *   npx tsx simulations/verify-snapshot-root.ts
 *
 * Exits 0 on match, 1 on mismatch / parse failure.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { stackingData } from "../data/stacking-data";
import { MIA_ID, scaledVoteFromCycles } from "../data/scaled-vote";
import { buildMerkleTree } from "../tests/merkle-helpers";

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = resolve(
  here,
  "..",
  "contracts",
  "ccip026-miamicoin-burn-to-exit.clar",
);

function readOnChainRoot(): string {
  const src = readFileSync(contractPath, "utf8");
  // Match either snake-case or camelCase identifier styles.
  const re =
    /\(define-constant\s+(?:snapshot-merkle-root|snapshotMerkleRoot)\s+(0x[0-9a-fA-F]{64})\)/;
  const m = src.match(re);
  if (!m) {
    throw new Error(
      `Could not find snapshot-merkle-root constant in ${contractPath}`,
    );
  }
  return m[1].toLowerCase();
}

function main(): void {
  const onChainRoot = readOnChainRoot();

  const voters = stackingData
    .map((s) => ({
      address: s.address,
      scaledVote: scaledVoteFromCycles(s.cycle82Stacked, s.cycle83Stacked),
    }))
    .filter((v) => v.scaledVote > 0n);

  if (voters.length === 0) {
    console.error("No voters in stacking-data.ts after filtering zero rows.");
    process.exit(1);
  }

  const { root } = buildMerkleTree(voters, MIA_ID);
  const computedRoot = root.toLowerCase();

  console.log("Voters with non-zero vote :", voters.length);
  console.log("Tree leaves (padded to 2ⁿ):", nextPow2(voters.length));
  console.log("Computed root             :", computedRoot);
  console.log("On-chain root             :", onChainRoot);

  if (computedRoot === onChainRoot) {
    console.log("\n✓ Match — safe to deploy.");
    process.exit(0);
  }

  console.error("\n✗ Mismatch — DO NOT DEPLOY.");
  console.error(
    "  Either the snapshot-merkle-root constant is stale, or data/stacking-data.ts",
  );
  console.error(
    "  was regenerated against a different tip. Resolve before deploy.",
  );
  process.exit(1);
}

function nextPow2(n: number): number {
  return 2 ** Math.ceil(Math.log2(n));
}

main();
