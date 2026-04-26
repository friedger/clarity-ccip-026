import { stackingData } from "@data/stacking-data";
import { scaledVoteFromCycles } from "@data/scaled-vote";
import { buildTree, type MerkleProofData } from "./merkle";

export interface VoterRow {
  address: string;
  /** Average stacked across cycles 82 and 83, in uMIA. Display only. */
  averageStacked: bigint;
  /** Scaled vote weight committed by the Merkle leaf. */
  scaledVote: bigint;
}

let cached: {
  voters: VoterRow[];
  root: string;
  proofs: Map<string, MerkleProofData>;
} | null = null;

export function getSnapshot() {
  if (cached) return cached;

  const voters: VoterRow[] = stackingData
    .map((s) => ({
      address: s.address,
      averageStacked: s.average,
      scaledVote: scaledVoteFromCycles(s.cycle82Stacked, s.cycle83Stacked),
    }))
    .filter((v) => v.scaledVote > 0n);

  const { root, proofs } = buildTree(
    voters.map((v) => ({ address: v.address, scaledVote: v.scaledVote })),
  );
  cached = { voters, root, proofs };
  return cached;
}

export function findVoter(address: string): VoterRow | undefined {
  return getSnapshot().voters.find((v) => v.address === address);
}

export function getProofFor(address: string): MerkleProofData | undefined {
  return getSnapshot().proofs.get(address);
}
