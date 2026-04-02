/**
 * Merkle tree helpers for tests.
 * Mirrors the Clarity implementation in ccip026-miamicoin-burn-to-exit.clar.
 */

import { createHash } from "node:crypto";
import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";

const MERKLE_LEAF_TAG = new TextEncoder().encode("merkle-leaf");
const MERKLE_PARENT_TAG = new TextEncoder().encode("merkle-parent");

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

function cvToBytes(cv: ClarityValue): Uint8Array {
  const hex = serializeCV(cv);
  if (typeof hex === "string") {
    return fromHex(hex);
  }
  return new Uint8Array(hex as unknown as Uint8Array);
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

export function hashLeaf(
  principal: string,
  fieldId: bigint,
  amount: bigint,
): Uint8Array {
  const principalBuf = cvToBytes(Cl.principal(principal));
  const fieldIdBuf = cvToBytes(Cl.uint(fieldId));
  const amountBuf = cvToBytes(Cl.uint(amount));
  return sha256(concat(MERKLE_LEAF_TAG, principalBuf, fieldIdBuf, amountBuf));
}

function hashParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(MERKLE_PARENT_TAG, left, right));
}

export interface MerkleProofData {
  proof: string[];
  positions: boolean[];
}

export interface VoterEntry {
  address: string;
  scaledVote: bigint;
}

/**
 * Build a Merkle tree from voter entries and return the root + per-voter proofs.
 * fieldId is MIA_ID (1n).
 */
export function buildMerkleTree(
  entries: VoterEntry[],
  fieldId: bigint = 1n,
): { root: string; proofs: MerkleProofData[] } {
  if (entries.length === 0) {
    throw new Error("Cannot build tree from zero leaves");
  }

  const leaves = entries.map((e) => hashLeaf(e.address, fieldId, e.scaledVote));

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

  const root = `0x${toHex(current[0])}`;

  // Compute proof for each original leaf
  const proofs: MerkleProofData[] = [];
  for (let i = 0; i < entries.length; i++) {
    const proof: string[] = [];
    const positions: boolean[] = [];
    let idx = i;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      proof.push(`0x${toHex(layers[layer][siblingIdx])}`);
      positions.push(isRight);
      idx = Math.floor(idx / 2);
    }
    proofs.push({ proof, positions });
  }

  return { root, proofs };
}
