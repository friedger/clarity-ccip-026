# CCIP 026 - Miamicoin Burn To Exit

## Contract implementation

This folder contains Clarity code according to CCIP-026:

- ccip026-miamicoin-burn-to-exit.clar handles voting and activation of new redemption extension ccd013.
- ccd013-burn-to-exit-mia.clar handles redemption once activated.

The project uses clarinet with mainnet execution simulation (MXS) starting at stacks block height 3491155.

When running tests with MXS and hitting rate limits, provide a `HIRO_API_KEY` from `https://platform.hiro.so` or use your own node.

## Merkle Tree

Voting power is determined off-chain from a snapshot of MIA stacking data (cycles 82 and 83) and committed on-chain as a single Merkle root. Voters submit a Merkle proof when casting their vote, which the contract verifies against the hardcoded root.

### Determinism

The Merkle root is fully deterministic. Given the same stacking data, the same root is always produced because:

1. **Fixed input order** — `data/stacking-data.ts` is sorted alphabetically by address.
2. **Deterministic vote calculation** — each voter's scaled vote is `(cycle82 * 10^16 + cycle83 * 10^16) / 2`. Only entries with a non-zero result are included.
3. **Deterministic tree construction** — leaves are hashed in input order, padded to the next power of 2 with zero hashes, then paired bottom-up.

### Construction

The tree is built in `tests/merkle-helpers.ts` (used by tests) and `simulations/calculate-mia-votes.ts` (standalone script). Both produce identical results.

**Leaf hashing** (domain-separated, tagged SHA-256):

```
leaf = SHA256("merkle-leaf" || consensus(principal) || consensus(fieldId) || consensus(scaledVote))
```

- `principal` — the voter's Stacks address
- `fieldId` — city ID (`u1` for MIA)
- `scaledVote` — the scaled vote amount (MIA \* 10^16)
- `consensus(...)` — SIP-005 consensus serialization (`to-consensus-buff?` in Clarity)

**Parent hashing**:

```
parent = SHA256("merkle-parent" || left || right)
```

**Padding** — the leaf array is padded to the next power of 2 with 32 zero bytes. For 299 voters the tree has 512 leaves (213 padding nodes) and depth 9.

**Proof structure** — each proof is a list of up to 9 sibling hashes plus a `positions` list of booleans indicating whether the sibling is on the left (`true`) or right (`false`). The contract verifies proofs via a fold over a fixed index list of length 32 (unused indices are skipped).

### Verification

The on-chain contract (`ccip026-miamicoin-burn-to-exit.clar`) verifies proofs against the hardcoded `snapshotMerkleRoot` constant. The root can be independently reproduced:

```bash
npx tsx simulations/calculate-mia-votes.ts
```

Voter data can be cross-checked against the ccip024 mainnet vote results:

```bash
HIRO_API_KEY=... npx tsx simulations/verify-ccip024-voters.ts
```

## Tests

### Unit Tests using Clarinet JS SDK

Folder `tests` contains unit tests using clarinet-sdk

Run with:

```
npm test cc
```

### Unit tests with Clarunit

Folder `tests` contains also unit test contracts

Run with:

```
npm test clarunit
```

### Fuzzy testing

Folder `contracts` also contains rendez vous contracts

Run with:

```
npm test:rv
npm test:rv2
```

### Stxer simulation

Folder `simulation` contains a stxer.xyz simulation on stacks block height 3491155.

Run with:

```
npm test:stxer
```
