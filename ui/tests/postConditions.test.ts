import { describe, expect, it } from "vitest";
import { buildRedeemPostConditions } from "../src/lib/postConditions";
import { MIA_REWARDS_TREASURY, MIA_V1, MIA_V2 } from "../src/lib/config";
import { preparePostConditions } from "../src/lib/wallet";

const ALICE = "SP466FNC0P7JWTNM2R9T199QRZN1MYEDTAR0KP27";
const TREASURY_FULL = `${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}`;
const MIA_V1_FULL = `${MIA_V1.address}.${MIA_V1.name}`;
const MIA_V2_FULL = `${MIA_V2.address}.${MIA_V2.name}`;

describe("buildRedeemPostConditions", () => {
  it("emits 3 PCs for a mixed v1+v2 burn", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 10n,
      burnV2Umia: 1_500_000n,
      redemptionUstx: 2300n,
    });
    expect(pcs).toHaveLength(3);
  });

  it("omits the v1 PC when burnV1Mia is zero", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 0n,
      burnV2Umia: 1_500_000n,
      redemptionUstx: 2300n,
    });
    expect(pcs).toHaveLength(2);
  });

  it("omits the v2 PC when burnV2Umia is zero", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 10n,
      burnV2Umia: 0n,
      redemptionUstx: 2300n,
    });
    expect(pcs).toHaveLength(2);
  });

  it("always emits the treasury STX guarantee", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 0n,
      burnV2Umia: 0n,
      redemptionUstx: 1n,
    });
    expect(pcs).toHaveLength(1);
  });

  it("targets the rewards treasury principal for the STX PC", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 0n,
      burnV2Umia: 0n,
      redemptionUstx: 5000n,
    });
    const stxPc = pcs[0] as Record<string, unknown>;
    // The PC builder in @stacks/transactions exposes the principal address
    // somewhere in the object graph; accept either of the common shapes.
    const json = JSON.stringify(stxPc);
    expect(json).toContain(TREASURY_FULL.split(".")[0]);
    expect(json).toContain(TREASURY_FULL.split(".")[1]);
  });

  it("references the v1 and v2 token contracts by full id", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 1n,
      burnV2Umia: 1n,
      redemptionUstx: 1n,
    });
    const json = JSON.stringify(pcs);
    expect(json).toContain(MIA_V1_FULL.split(".")[0]);
    expect(json).toContain(MIA_V1_FULL.split(".")[1]);
    expect(json).toContain(MIA_V2_FULL.split(".")[0]);
    expect(json).toContain(MIA_V2_FULL.split(".")[1]);
    expect(json).toContain("miamicoin");
  });

  it("encodes amounts at the position the user passed", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 42n,
      burnV2Umia: 1_500_000n,
      redemptionUstx: 9_999_999n,
    });
    const json = JSON.stringify(pcs);
    expect(json).toContain("42");
    expect(json).toContain("1500000");
    expect(json).toContain("9999999");
  });

  it("returns Pc-builder objects ready for @stacks/connect v8", () => {
    const pcs = buildRedeemPostConditions({
      userAddress: ALICE,
      burnV1Mia: 10n,
      burnV2Umia: 1_500_000n,
      redemptionUstx: 2300n,
    });
    const prepared = preparePostConditions(pcs);
    expect(prepared).toHaveLength(3);
    expect(prepared[0]).toMatchObject({
      type: "ft-postcondition",
      condition: "lte",
      amount: "10",
    });
    expect(prepared[1]).toMatchObject({
      type: "ft-postcondition",
      condition: "lte",
      amount: "1500000",
    });
    expect(prepared[2]).toMatchObject({
      type: "stx-postcondition",
      condition: "gte",
      amount: "2300",
    });
  });
});
