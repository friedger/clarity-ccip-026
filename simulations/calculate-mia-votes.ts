/**
 * Off-chain calculation of scaled MIA votes and Merkle tree construction.
 *
 * Replicates the get-mia-vote logic from ccip026-miamicoin-burn-to-exit.clar
 * and builds a Merkle tree whose root is used in the contract.
 * Voters then submit their proof when calling vote-on-proposal.
 *
 * Usage:
 *   npx tsx simulations/calculate-mia-votes.ts
 */

import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { stackingData } from "../data/stacking-data";
import { sha256 as noble_sha256 } from "@noble/hashes/sha2.js";
// ---------------------------------------------------------------------------
// Constants (must match the Clarity contract)
// ---------------------------------------------------------------------------

const MERKLE_LEAF_TAG = new TextEncoder().encode("merkle-leaf");
const MERKLE_PARENT_TAG = new TextEncoder().encode("merkle-parent");
const VOTE_SCALE_FACTOR = 10n ** 16n;
const MIA_ID = 1n;

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Consensus encoding helpers
// ---------------------------------------------------------------------------

/** Convert a ClarityValue to its SIP-005 consensus bytes (same as to-consensus-buff? in Clarity). */
function cvToBytes(cv: ClarityValue): Uint8Array {
  const hex = serializeCV(cv);
  if (typeof hex === "string") {
    return fromHex(hex);
  }
  return new Uint8Array(hex as unknown as Uint8Array);
}

// ---------------------------------------------------------------------------
// Merkle hashing (mirrors the Clarity implementation)
// ---------------------------------------------------------------------------

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(noble_sha256(data));
}

/** hash-leaf: sha256(MERKLE_LEAF_TAG ++ principal_cv ++ field_id_cv ++ amount_cv) */
function hashLeaf(
  principal: string,
  fieldId: bigint,
  amount: bigint,
): Uint8Array {
  const principalBuf = cvToBytes(Cl.principal(principal));
  const fieldIdBuf = cvToBytes(Cl.uint(fieldId));
  const amountBuf = cvToBytes(Cl.uint(amount));
  return sha256(concat(MERKLE_LEAF_TAG, principalBuf, fieldIdBuf, amountBuf));
}

/** hash-parent: sha256(MERKLE_PARENT_TAG ++ left ++ right) */
function hashParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(MERKLE_PARENT_TAG, left, right));
}

// ---------------------------------------------------------------------------
// Merkle tree construction
// ---------------------------------------------------------------------------

interface MerkleProof {
  proof: Uint8Array[];
  positions: boolean[];
}

function buildMerkleTree(leaves: Uint8Array[]): {
  root: Uint8Array;
  proofs: MerkleProof[];
} {
  if (leaves.length === 0) {
    throw new Error("Cannot build tree from zero leaves");
  }

  // Pad to next power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(leaves.length)));
  const zeroHash = new Uint8Array(32);
  const paddedLeaves = [
    ...leaves,
    ...Array<Uint8Array>(size - leaves.length).fill(zeroHash),
  ];

  // Build layers bottom-up
  const layers: Uint8Array[][] = [paddedLeaves];
  let current = paddedLeaves;
  while (current.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(hashParent(current[i], current[i + 1]));
    }
    layers.push(next);
    current = next;
  }

  const root = current[0];

  // Compute proof for each original leaf
  const proofs: MerkleProof[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const proof: Uint8Array[] = [];
    const positions: boolean[] = [];
    let idx = i;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      proof.push(layers[layer][siblingIdx]);
      // positions[i] = true means sibling is on the left (current node is right child)
      positions.push(isRight);
      idx = Math.floor(idx / 2);
    }
    proofs.push({ proof, positions });
  }

  return { root, proofs };
}

// ---------------------------------------------------------------------------
// Scaled MIA vote calculation (replicates get-mia-vote with scaled=true)
// ---------------------------------------------------------------------------

/**
 * Calculates the scaled MIA vote amount for a user.
 *
 * Formula (from the Clarity contract):
 *   scaledVote = (scale-up(cycle82Amount) + scale-up(cycle83Amount)) / 2
 * where scale-up(x) = x * VOTE_SCALE_FACTOR
 *
 * @param cycle82Amount - MIA stacked in cycle 82 (micro units)
 * @param cycle83Amount - MIA stacked in cycle 83 (micro units)
 * @returns The scaled vote amount (before scale-down)
 */
export function calculateScaledMiaVote(
  cycle82Amount: bigint,
  cycle83Amount: bigint,
): bigint {
  return (
    (cycle82Amount * VOTE_SCALE_FACTOR + cycle83Amount * VOTE_SCALE_FACTOR) / 2n
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Calculate scaled votes and filter out zero-vote users
  const entries = stackingData
    .map(({ address, cycle82Stacked, cycle83Stacked }) => ({
      address,
      scaledVote: calculateScaledMiaVote(cycle82Stacked, cycle83Stacked),
    }))
    .filter(({ scaledVote }) => scaledVote > 0n);

  if (entries.length === 0) {
    console.log(
      "No eligible voters found. Add stacking data to stackingData array.",
    );
    return;
  }

  // Build leaf hashes
  const leaves = entries.map(({ address, scaledVote }) =>
    hashLeaf(address, MIA_ID, scaledVote),
  );

  // Build Merkle tree
  const { root, proofs } = buildMerkleTree(leaves);

  console.log("=== Merkle Snapshot ===");
  console.log(`Root: 0x${toHex(root)}`);
  console.log(`Total voters: ${entries.length}`);
  console.log("");

  // Output per-voter data (can be used to construct vote transactions)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { proof, positions } = proofs[i];
    const voteAfterScaleDown = entry.scaledVote / VOTE_SCALE_FACTOR;
    if (
      entry.address === "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A" ||
      entry.address === "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA"
    ) {
      console.log(`--- ${entry.address} ---`);
      console.log(`  scaledMiaVoteAmount: u${entry.scaledVote}`);
      console.log(`  vote (after scale-down): ${voteAfterScaleDown}`);
      console.log(
        `  proof: (list ${proof.map((b) => `0x${toHex(b)}`).join(" ")})`,
      );
      console.log(`  positions: (list ${positions.join(" ")})`);
      console.log("");
    }
  }
}

main().catch(console.error);
