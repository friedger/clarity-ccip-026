// Network + contract addresses. Override the deployer at deploy time.

export const HIRO_API = "https://api.hiro.so";
export const STACKS_NETWORK = "mainnet" as const;

// CCIP-026 + ccd013 are deployed by the proposer wallet. Set this to the
// actual deployer once known. Leave empty to surface a clear UI error.
export const CCIP_DEPLOYER =
  (import.meta.env.VITE_CCIP_DEPLOYER as string | undefined) ?? "";

export const CCIP_026 = {
  address: CCIP_DEPLOYER,
  name: "ccip026-miamicoin-burn-to-exit",
};

export const CCD013 = {
  address: CCIP_DEPLOYER,
  name: "ccd013-burn-to-exit-mia",
};

// Mainnet CityCoins DAO + token contracts (immutable references)
export const MIA_V1 = {
  address: "SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27",
  name: "miamicoin-token",
};
export const MIA_V2 = {
  address: "SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R",
  name: "miamicoin-token-v2",
};
export const MIA_REWARDS_TREASURY = {
  address: "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH",
  name: "ccd002-treasury-mia-rewards-v3",
};
export const MIA_MINING_TREASURY = {
  address: "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH",
  name: "ccd002-treasury-mia-mining-v3",
};
export const USER_REGISTRY = {
  address: "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH",
  name: "ccd003-user-registry",
};

// Fast Pool: STX delegated stacking via PoX-4. Override via env if needed.
export const FAST_POOL = {
  address:
    (import.meta.env.VITE_FAST_POOL_ADDRESS as string | undefined) ??
    "SPMPMA1V6P430M8C91QS1G9XJ95S59JS1TZFZ4Q4",
  name:
    (import.meta.env.VITE_FAST_POOL_NAME as string | undefined) ??
    "pox4-multi-pool-v1",
};

export const MIA_ID = 1n;
export const VOTE_SCALE_FACTOR = 10n ** 16n;
export const MICRO_CITYCOINS = 10n ** 6n;
export const REDEMPTION_SCALE = 10n ** 6n;
export const MAX_PER_TX_UMIA = 10_000_000n * MICRO_CITYCOINS;

export const SNAPSHOT_MERKLE_ROOT =
  "0x776695e7e2659b4a92ed54d411456f244568e2572d8e8133fc0c2381c9d154b3";
