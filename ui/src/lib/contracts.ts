import { Cl } from "@stacks/transactions";
import {
  CCD013,
  CCIP_026,
  MIA_REWARDS_TREASURY,
  MIA_V1,
  MIA_V2,
  POX_4,
  USER_REGISTRY,
} from "./config";
import type { ContractRef, ReadOnlyClient } from "./api";

// --- domain types ---

export interface ProposalInfo {
  name: string;
  link: string;
  hash: string;
}

export interface VotePeriod {
  startBlock: bigint;
  endBlock: bigint;
  length: bigint;
}

export interface VoteTotals {
  yesAmount: bigint;
  noAmount: bigint;
  yesCount: number;
  noCount: number;
}

export interface RedemptionInfo {
  enabled: boolean;
  blockHeight: bigint;
  totalSupply: bigint;
  miningTreasury: bigint;
  contractBalance: bigint;
  ratio: bigint;
  totalRedeemed: bigint;
  totalTransferred: bigint;
}

export interface UserRedemption {
  v1mia: bigint;
  v2umia: bigint;
  totalUmia: bigint;
  redemptionUstx: bigint;
  burnUmia: bigint;
  burnV1: bigint;
  burnV2: bigint;
  claimedUmia: bigint;
  claimedUstx: bigint;
}

// --- raw on-chain shapes (string-encoded uints from cvToValue) ---

interface RawVoteTotals {
  "total-amount-yes": string;
  "total-amount-no": string;
  "total-votes-yes": string;
  "total-votes-no": string;
}

interface RawRedemptionInfo {
  "redemption-enabled": boolean;
  "block-height": string;
  "total-supply": string;
  "mining-treasury-ustx": string;
  "current-contract-balance": string;
  "redemption-ratio": string;
  "total-redeemed": string;
  "total-transferred": string;
}

interface RawUserRedemption {
  address: string;
  "mia-balances": {
    "balance-v1-mia": string;
    "balance-v2-umia": string;
    "total-balance-umia": string;
  };
  "redemption-amount-ustx": string;
  "burn-amount-umia": string;
  "burn-amount-v1-mia": string;
  "burn-amount-v2-umia": string;
  "redemption-claims": { umia: string; ustx: string };
}

// --- pure mappers (testable in isolation) ---

export function mapVoteTotals(raw: RawVoteTotals | null): VoteTotals {
  if (!raw) {
    return { yesAmount: 0n, noAmount: 0n, yesCount: 0, noCount: 0 };
  }
  return {
    yesAmount: BigInt(raw["total-amount-yes"]),
    noAmount: BigInt(raw["total-amount-no"]),
    yesCount: Number(raw["total-votes-yes"]),
    noCount: Number(raw["total-votes-no"]),
  };
}

export function mapRedemptionInfo(raw: RawRedemptionInfo): RedemptionInfo {
  return {
    enabled: raw["redemption-enabled"],
    blockHeight: BigInt(raw["block-height"]),
    totalSupply: BigInt(raw["total-supply"]),
    miningTreasury: BigInt(raw["mining-treasury-ustx"]),
    contractBalance: BigInt(raw["current-contract-balance"]),
    ratio: BigInt(raw["redemption-ratio"]),
    totalRedeemed: BigInt(raw["total-redeemed"]),
    totalTransferred: BigInt(raw["total-transferred"]),
  };
}

export function mapUserRedemption(raw: RawUserRedemption): UserRedemption {
  const b = raw["mia-balances"];
  return {
    v1mia: BigInt(b["balance-v1-mia"]),
    v2umia: BigInt(b["balance-v2-umia"]),
    totalUmia: BigInt(b["total-balance-umia"]),
    redemptionUstx: BigInt(raw["redemption-amount-ustx"]),
    burnUmia: BigInt(raw["burn-amount-umia"]),
    burnV1: BigInt(raw["burn-amount-v1-mia"]),
    burnV2: BigInt(raw["burn-amount-v2-umia"]),
    claimedUmia: BigInt(raw["redemption-claims"].umia),
    claimedUstx: BigInt(raw["redemption-claims"].ustx),
  };
}

export function computeYesShare(totals: VoteTotals): number {
  const total = totals.yesAmount + totals.noAmount;
  if (total === 0n) return 0;
  return Number((totals.yesAmount * 10000n) / total) / 100;
}

// --- service classes (thin orchestration over a ReadOnlyClient) ---

export class Ccip026Service {
  constructor(private readonly client: ReadOnlyClient) {}

  getProposalInfo(): Promise<ProposalInfo | null> {
    return this.client.callReadOnly(CCIP_026, "get-proposal-info");
  }

  async getVotePeriod(): Promise<VotePeriod | null> {
    const raw = await this.client.callReadOnly<{
      "start-block": string;
      "end-block": string;
      length: string;
    } | null>(CCIP_026, "get-vote-period");
    if (!raw) return null;
    return {
      startBlock: BigInt(raw["start-block"]),
      endBlock: BigInt(raw["end-block"]),
      length: BigInt(raw.length),
    };
  }

  isVoteActive(): Promise<boolean | null> {
    return this.client.callReadOnly(CCIP_026, "is-vote-active");
  }

  async getVoteTotals(): Promise<VoteTotals> {
    const raw = await this.client.callReadOnly<{
      totals: RawVoteTotals;
      mia: RawVoteTotals;
    } | null>(CCIP_026, "get-vote-totals");
    return mapVoteTotals(raw?.totals ?? null);
  }

  async getUserId(address: string): Promise<bigint | null> {
    const v = await this.client.callReadOnly<string | null>(
      USER_REGISTRY,
      "get-user-id",
      [Cl.principal(address)],
    );
    return v == null ? null : BigInt(v);
  }

  async getVoterInfo(
    userId: bigint,
  ): Promise<{ vote: boolean; mia: bigint } | null> {
    const v = await this.client.callReadOnly<{
      vote: boolean;
      mia: string;
    } | null>(CCIP_026, "get-voter-info", [Cl.uint(userId)]);
    return v ? { vote: v.vote, mia: BigInt(v.mia) } : null;
  }
}

/**
 * Thin read-only access to the `SP000…002Q6VF78.pox-4` consensus contract.
 * Today only used to inspect whether the user has already granted a wrapper
 * (Fast Pool) permission to call delegate-stx on their behalf.
 */
export class Pox4Service {
  constructor(private readonly client: ReadOnlyClient) {}

  /**
   * Returns the allowance entry for `sender → callingContract`, or null when
   * the sender has not granted the caller. `untilBurnHt` is `null` when the
   * grant is open-ended.
   */
  async getAllowanceContractCallers(
    sender: string,
    callingContract: ContractRef,
  ): Promise<{ untilBurnHt: bigint | null } | null> {
    const raw = await this.client.callReadOnly<{
      "until-burn-ht": string | null;
    } | null>(POX_4, "get-allowance-contract-callers", [
      Cl.principal(sender),
      Cl.principal(`${callingContract.address}.${callingContract.name}`),
    ]);
    if (!raw) return null;
    const u = raw["until-burn-ht"];
    return { untilBurnHt: u == null ? null : BigInt(u) };
  }
}

export class Ccd013Service {
  constructor(private readonly client: ReadOnlyClient) {}

  async getRedemptionInfo(): Promise<RedemptionInfo> {
    const raw = await this.client.callReadOnly<RawRedemptionInfo>(
      CCD013,
      "get-redemption-info",
    );
    return mapRedemptionInfo(raw);
  }

  async getUserRedemptionInfo(
    address: string,
    amountUmia?: bigint,
  ): Promise<UserRedemption> {
    const amount = amountUmia == null ? Cl.none() : Cl.some(Cl.uint(amountUmia));
    const raw = await this.client.callReadOnly<RawUserRedemption>(
      CCD013,
      "get-user-redemption-info",
      [Cl.principal(address), amount],
    );
    return mapUserRedemption(raw);
  }

  getMiaV1Balance(address: string): Promise<bigint> {
    return this.client
      .callReadOnly<string>(MIA_V1, "get-balance", [Cl.principal(address)])
      .then((v) => BigInt(v ?? 0));
  }

  getMiaV2Balance(address: string): Promise<bigint> {
    return this.client
      .callReadOnly<string>(MIA_V2, "get-balance", [Cl.principal(address)])
      .then((v) => BigInt(v ?? 0));
  }

  getRewardsTreasuryStx(): Promise<bigint> {
    return this.client
      .fetchAccount(`${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}`)
      .then((a) => a.balance);
  }
}
