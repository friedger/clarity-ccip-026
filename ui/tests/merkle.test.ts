import { describe, expect, it } from "vitest";
import { buildTree, hashLeaf } from "../src/lib/merkle";
import { scaledVoteFromCycles } from "../../data/scaled-vote";

const ALICE = "SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27";
const BOB = "SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R";

describe("scaledVoteFromCycles", () => {
  it("scales each cycle by 10^16 before averaging", () => {
    expect(scaledVoteFromCycles(2n, 4n)).toBe(3n * 10n ** 16n);
  });

  it("preserves a half-uMIA when (cycle82 + cycle83) is odd", () => {
    // Averaging-then-scaling would yield 1 * 10^16; the correct answer keeps
    // the half-step => floor((1 + 2) * 10^16 / 2) == 1.5 * 10^16
    expect(scaledVoteFromCycles(1n, 2n)).toBe(15n * 10n ** 15n);
  });

  it("returns zero when both cycles are zero", () => {
    expect(scaledVoteFromCycles(0n, 0n)).toBe(0n);
  });
});

describe("hashLeaf", () => {
  it("is deterministic", () => {
    const a = hashLeaf(ALICE, 1n, 1000n);
    const b = hashLeaf(ALICE, 1n, 1000n);
    expect(Buffer.from(a).toString("hex")).toBe(Buffer.from(b).toString("hex"));
  });

  it("changes when any input changes", () => {
    const base = Buffer.from(hashLeaf(ALICE, 1n, 1000n)).toString("hex");
    expect(Buffer.from(hashLeaf(BOB, 1n, 1000n)).toString("hex")).not.toBe(base);
    expect(Buffer.from(hashLeaf(ALICE, 2n, 1000n)).toString("hex")).not.toBe(base);
    expect(Buffer.from(hashLeaf(ALICE, 1n, 1001n)).toString("hex")).not.toBe(base);
  });
});

describe("buildTree", () => {
  const entries = [
    { address: ALICE, scaledVote: 100n },
    { address: BOB, scaledVote: 200n },
  ];

  it("produces a 32-byte 0x-prefixed root", () => {
    const { root } = buildTree(entries);
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("emits one proof per voter", () => {
    const { proofs } = buildTree(entries);
    expect(proofs.size).toBe(2);
    expect(proofs.get(ALICE)?.proof.length).toBe(1);
    expect(proofs.get(ALICE)?.positions.length).toBe(1);
  });

  it("encodes sibling positions: leaf 0 has sibling on the right (false)", () => {
    const { proofs } = buildTree(entries);
    expect(proofs.get(ALICE)?.positions[0]).toBe(false);
    expect(proofs.get(BOB)?.positions[0]).toBe(true);
  });

  it("rejects empty inputs", () => {
    expect(() => buildTree([])).toThrow();
  });

  it("is stable when called twice", () => {
    const a = buildTree(entries).root;
    const b = buildTree(entries).root;
    expect(a).toBe(b);
  });

  it("pads non-power-of-two voter sets with zero hashes", () => {
    const odd = [
      { address: ALICE, scaledVote: 1n },
      { address: BOB, scaledVote: 2n },
      { address: "SP000000000000000000002Q6VF78", scaledVote: 3n },
    ];
    const { root, proofs } = buildTree(odd);
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    // Tree of 3 voters padded to 4 leaves -> proof depth 2
    expect(proofs.get(ALICE)?.proof.length).toBe(2);
  });
});
