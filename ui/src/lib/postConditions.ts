import { Pc, type PostCondition } from "@stacks/transactions";
import { MIA_REWARDS_TREASURY, MIA_V1, MIA_V2 } from "./config";

const MIA_ASSET_NAME = "miamicoin";

export interface RedeemPostConditionInputs {
  userAddress: string;
  /** Whole MIA the contract will burn from v1 (matches burn-amount-v1-mia). */
  burnV1Mia: bigint;
  /** Micro-MIA the contract will burn from v2 (matches burn-amount-v2-umia). */
  burnV2Umia: bigint;
  /** Micro-STX the user expects to receive (matches redemption-amount-ustx). */
  redemptionUstx: bigint;
}

/**
 * Build strict post-conditions for ccd013-burn-to-exit-mia.redeem-mia.
 *
 * Semantics, derived from the read-only preview:
 *   - user willSendLte burnV1Mia of v1 MIA: protects against the contract
 *     burning more v1 than the preview promised (e.g. due to a balance shift
 *     between preview and execution).
 *   - user willSendLte burnV2Umia of v2 MIA: same rationale, in uMIA.
 *   - rewards-treasury willSendGte redemptionUstx of STX: guarantees the
 *     user receives at least the previewed STX or the tx aborts. This is
 *     stricter than necessary in the treasury-cap shrink path, which is
 *     intentional: the user can re-preview and resubmit.
 *
 * v1 and v2 PCs are omitted when their burn amount is zero so we don't ask
 * the wallet to verify a no-op.
 */
export function buildRedeemPostConditions(
  args: RedeemPostConditionInputs,
): PostCondition[] {
  const pcs: PostCondition[] = [];

  if (args.burnV1Mia > 0n) {
    pcs.push(
      Pc.principal(args.userAddress)
        .willSendLte(args.burnV1Mia)
        .ft(
          `${MIA_V1.address}.${MIA_V1.name}` as `${string}.${string}`,
          MIA_ASSET_NAME,
        ),
    );
  }

  if (args.burnV2Umia > 0n) {
    pcs.push(
      Pc.principal(args.userAddress)
        .willSendLte(args.burnV2Umia)
        .ft(
          `${MIA_V2.address}.${MIA_V2.name}` as `${string}.${string}`,
          MIA_ASSET_NAME,
        ),
    );
  }

  pcs.push(
    Pc.principal(
      `${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}`,
    )
      .willSendGte(args.redemptionUstx)
      .ustx(),
  );

  return pcs;
}
