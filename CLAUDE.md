# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository implements CCIP-026, a MiamiCoin (MIA) "burn to exit" mechanism for the CityCoins protocol on Stacks. It allows MIA token holders to redeem their tokens for a portion of the MIA rewards treasury at a dynamically calculated ratio. Voting uses Merkle proof-verified snapshots of voter balances.

## Build & Test Commands

```bash
# Install dependencies
npm install

# Run unit tests (Clarinet SDK with vitest)
npm test cc                    # Run tests matching "cc"
npm test clarunit              # Run Clarunit tests

# Run fuzz/property-based tests (Rendezvous)
npm run test:rv                # ccd013-burn-to-exit-mia test suite
npm run test:rv2               # ccd013-burn-to-exit-mia invariants
npm run test:rv3               # ccip026-miamicoin-burn-to-exit tests
npm run test:rv4               # ccip026-miamicoin-burn-to-exit invariants

# Run Stxer simulation
npm run test:stxer

# Watch mode with coverage
npm run test:watch
```

To run a single test file:
```bash
npx vitest run tests/ccd013-burn-to-exit-mia.test.ts
```

## Mainnet Execution Simulation (MXS)

Tests run with MXS enabled, forking from Stacks mainnet at block height 3491155. This allows testing against real mainnet state (existing contracts, balances, stacking data). The `api_url` in `Clarinet.toml` defaults to `http://localhost:3999` (local Stacks node).

When hitting API rate limits, provide a `HIRO_API_KEY` environment variable from https://platform.hiro.so or configure your own node.

## Architecture

### Contracts

- **ccip026-miamicoin-burn-to-exit.clar** - Governance proposal contract that handles voting and activation. Implements `proposal-trait`. Voting is verified via Merkle proofs against a snapshot root (set by admin). When executed, enables the `ccd013` extension and initializes redemptions.

- **ccd013-burn-to-exit-mia.clar** - The redemption extension that burns MIA (v1 or v2) tokens and transfers STX to users. Implements `extension-trait`. Key constants:
  - `MAX_PER_TRANSACTION`: 10M MIA per transaction
  - `MICRO_CITYCOINS`: 10^6, `REDEMPTION_SCALE_FACTOR`: 10^6

### Test Structure

- **tests/*.test.ts** - Vitest unit tests using Clarinet SDK (120s timeout, single fork pool)
- **tests/clients/*.ts** - Typed wrappers around contract calls using `clarity-abitype`
- **tests/abis/*.ts** - ABI type definitions consumed by `clarity-abitype/clarinet-sdk` for type-safe `typedCallPublicFn`/`typedCallReadOnlyFn`
- **tests/merkle-helpers.ts** - TypeScript Merkle tree builder that mirrors the Clarity verification logic (tagged SHA-256 hashing)
- **tests/*.clar** - Clarunit test contracts
- **contracts/*.tests.clar** - Rendezvous property/fuzz test contracts
- **simulations/*.ts** - Stxer simulation scripts and vote calculation utilities

### Key Testing Pattern

Tests use `clarity-abitype` for type-safe contract interactions. The pattern is:
1. ABI definitions in `tests/abis/` export typed objects
2. Client files in `tests/clients/` wrap calls via `typedCallPublicFn`/`typedCallReadOnlyFn`
3. Test files import from clients, not calling `simnet` directly for the project's own contracts

### External Dependencies

The contracts interact with deployed mainnet CityCoins DAO contracts:
- `SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao` - DAO base contract
- `SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute` - Executes proposals
- `SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3` - Treasury holding STX
- `SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token` - MIA v1 token
- `SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2` - MIA v2 token

## Clarity Conventions

- Error codes are prefixed by contract: `26xxx` for ccip026, `13xxx` for ccd013
- Amounts use micro units (6 decimal places) - `MICRO_CITYCOINS = 10^6`
- Vote scaling uses 16 decimal places for precision (`VOTE_SCALE_FACTOR = 10^16`)
