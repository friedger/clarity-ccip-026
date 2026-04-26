import { sha256 } from "@noble/hashes/sha2.js";
import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { MIA_ID } from "./config";

const MERKLE_LEAF_TAG = new TextEncoder().encode("merkle-leaf");
const MERKLE_PARENT_TAG = new TextEncoder().encode("merkle-parent");

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function cvBytes(cv: ClarityValue): Uint8Array {
  const result = serializeCV(cv);
  return typeof result === "string" ? fromHex(result) : (result as Uint8Array);
}

export function hashLeaf(
  principal: string,
  fieldId: bigint,
  amount: bigint,
): Uint8Array {
  return sha256(
    concat(
      MERKLE_LEAF_TAG,
      cvBytes(Cl.principal(principal)),
      cvBytes(Cl.uint(fieldId)),
      cvBytes(Cl.uint(amount)),
    ),
  );
}

function hashParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(MERKLE_PARENT_TAG, left, right));
}

export interface VoterEntry {
  address: string;
  scaledVote: bigint;
}

export interface MerkleProofData {
  proof: string[];
  positions: boolean[];
  scaledVote: bigint;
  root: string;
}

/**
 * Build the full tree and return the root + per-voter proofs. Mirrors the
 * tagged-SHA-256 layout of ccip026-miamicoin-burn-to-exit.clar.
 */
export function buildTree(
  entries: VoterEntry[],
  fieldId: bigint = MIA_ID,
): { root: string; proofs: Map<string, MerkleProofData> } {
  if (entries.length === 0) throw new Error("empty voter set");

  const leaves = entries.map((e) => hashLeaf(e.address, fieldId, e.scaledVote));
  const size = 2 ** Math.ceil(Math.log2(leaves.length));
  const zero = new Uint8Array(32);
  const padded = [...leaves, ...Array<Uint8Array>(size - leaves.length).fill(zero)];

  const layers: Uint8Array[][] = [padded];
  let cur = padded;
  while (cur.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(hashParent(cur[i], cur[i + 1]));
    }
    layers.push(next);
    cur = next;
  }
  const root = `0x${toHex(cur[0])}`;

  const proofs = new Map<string, MerkleProofData>();
  for (let i = 0; i < entries.length; i++) {
    const proof: string[] = [];
    const positions: boolean[] = [];
    let idx = i;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const isRight = idx % 2 === 1;
      const sibling = isRight ? idx - 1 : idx + 1;
      proof.push(`0x${toHex(layers[layer][sibling])}`);
      positions.push(isRight);
      idx = Math.floor(idx / 2);
    }
    proofs.set(entries[i].address, {
      proof,
      positions,
      scaledVote: entries[i].scaledVote,
      root,
    });
  }
  return { root, proofs };
}

// scaleVote(averageStacked) was removed because averaging-then-scaling loses
// a half-uMIA of precision when (cycle82 + cycle83) is odd, producing a
// different leaf hash than the contract expects. Use scaledVoteFromCycles
// from data/scaled-vote.ts instead.
