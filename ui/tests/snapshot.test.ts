import { describe, expect, it } from "vitest";
import { SNAPSHOT_MERKLE_ROOT } from "../src/lib/config";
import { findVoter, getProofFor, getSnapshot } from "../src/lib/snapshot";

describe("snapshot", () => {
  it("re-derives the on-chain Merkle root from /data/stacking-data.ts", () => {
    const { root } = getSnapshot();
    expect(root.toLowerCase()).toBe(SNAPSHOT_MERKLE_ROOT.toLowerCase());
  });

  it("emits one proof per non-zero voter", () => {
    const { voters, proofs } = getSnapshot();
    expect(proofs.size).toBe(voters.length);
    expect(voters.length).toBeGreaterThan(0);
  });

  it("findVoter returns the matching row for a known voter", () => {
    const { voters } = getSnapshot();
    const v = voters[0];
    expect(findVoter(v.address)?.scaledVote).toBe(v.scaledVote);
    expect(findVoter("SP000000000000000000002Q6VF78")).toBeUndefined();
  });

  it("getProofFor matches the snapshot's stored root", () => {
    const { voters, root } = getSnapshot();
    const proof = getProofFor(voters[0].address);
    expect(proof?.root).toBe(root);
  });
});
