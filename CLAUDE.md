# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository implements CCIP-026, a MiamiCoin (MIA) "burn to exit" mechanism for the CityCoins protocol on Stacks. It allows MIA token holders to redeem their tokens for a portion of the MIA rewards treasury at a fixed rate (0.0017 STX per MIA, or 1700 STX per 1M MIA).

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

Tests run with MXS enabled, forking from Stacks mainnet at block height 3491155. This allows testing against real mainnet state (existing contracts, balances, stacking data).

When hitting API rate limits, provide a `HIRO_API_KEY` environment variable from https://platform.hiro.so or configure your own node.

## Architecture

### Contracts

- **ccip026-miamicoin-burn-to-exit.clar** - Governance proposal contract that handles voting and activation. Implements `proposal-trait`. When executed, enables the `ccd013` extension and initializes redemptions.

- **ccd013-burn-to-exit-mia.clar** - The redemption extension that burns MIA (v1 or v2) tokens and transfers STX to users. Implements `extension-trait`. Key constants:
  - `REDEMPTION_RATIO`: 1700 (0.0017 STX per uMIA)
  - `MAX_PER_TRANSACTION`: 10M MIA per transaction

### Test Structure

- **tests/*.test.ts** - Vitest unit tests using Clarinet SDK
- **tests/clients/*.ts** - Helper functions wrapping contract calls
- **tests/*.clar** - Clarunit test contracts
- **contracts/*.tests.clar** - Rendezvous property/fuzz test contracts

### External Dependencies

The contracts interact with deployed mainnet CityCoins DAO contracts:
- `SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.base-dao` - DAO base contract
- `SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3` - Treasury holding STX
- `SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27.miamicoin-token` - MIA v1 token
- `SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2` - MIA v2 token

## Clarity Conventions

- Error codes are prefixed by contract: `26xxx` for ccip026, `13xxx` for ccd013
- Amounts use micro units (6 decimal places) - `MICRO_CITYCOINS = 10^6`
- Vote scaling uses 16 decimal places for precision
