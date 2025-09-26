# CCIP 026 - Miamicoin Burn To Exit

## Contract implementation

This folder contains Clarity code according to CCIP-026:

- ccip026-miamicoin-burn-to-exit.clar handles voting and activation of new redemption extension ccd013.
- ccd013-burn-to-exit-mia.clar handles redemption once activated.

The project uses clarinet with mainnet execution simulation (MXS) starting at stacks block height 3491155.

When running tests with MXS and hitting rate limits, provide a `HIRO_API_KEY` from `https://platform.hiro.so` or use your own node.

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
