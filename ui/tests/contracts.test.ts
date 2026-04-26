import { describe, expect, it } from "vitest";
import {
  Ccd013Service,
  Ccip026Service,
  computeYesShare,
  mapRedemptionInfo,
  mapUserRedemption,
  mapVoteTotals,
} from "../src/lib/contracts";
import { FakeClient } from "./_fakeClient";

const userAddress = "SPMPMA1V6P430M8C91QS1G9XJ95S59JS1TZFZ4Q4";

describe("mapVoteTotals", () => {
  it("returns zeroes when raw is null", () => {
    expect(mapVoteTotals(null)).toEqual({
      yesAmount: 0n,
      noAmount: 0n,
      yesCount: 0,
      noCount: 0,
    });
  });

  it("converts string-encoded uints to bigints", () => {
    expect(
      mapVoteTotals({
        "total-amount-yes": "100",
        "total-amount-no": "40",
        "total-votes-yes": "3",
        "total-votes-no": "2",
      }),
    ).toEqual({
      yesAmount: 100n,
      noAmount: 40n,
      yesCount: 3,
      noCount: 2,
    });
  });
});

describe("computeYesShare", () => {
  it("returns 0 when no votes", () => {
    expect(
      computeYesShare({ yesAmount: 0n, noAmount: 0n, yesCount: 0, noCount: 0 }),
    ).toBe(0);
  });

  it("computes percentages with 2-decimal precision", () => {
    expect(
      computeYesShare({
        yesAmount: 70n,
        noAmount: 30n,
        yesCount: 0,
        noCount: 0,
      }),
    ).toBe(70);
    expect(
      computeYesShare({
        yesAmount: 1n,
        noAmount: 2n,
        yesCount: 0,
        noCount: 0,
      }),
    ).toBeCloseTo(33.33, 2);
  });
});

describe("mapRedemptionInfo", () => {
  it("converts every field to its domain type", () => {
    const out = mapRedemptionInfo({
      "redemption-enabled": true,
      "block-height": "100",
      "total-supply": "5000000000",
      "mining-treasury-ustx": "1000000",
      "current-contract-balance": "999000",
      "redemption-ratio": "200",
      "total-redeemed": "0",
      "total-transferred": "0",
    });
    expect(out.enabled).toBe(true);
    expect(out.blockHeight).toBe(100n);
    expect(out.ratio).toBe(200n);
    expect(out.totalSupply).toBe(5_000_000_000n);
  });
});

describe("mapUserRedemption", () => {
  it("flattens balances and claims", () => {
    const out = mapUserRedemption({
      address: userAddress,
      "mia-balances": {
        "balance-v1-mia": "10",
        "balance-v2-umia": "1500000",
        "total-balance-umia": "11500000",
      },
      "redemption-amount-ustx": "2300",
      "burn-amount-umia": "11500000",
      "burn-amount-v1-mia": "10",
      "burn-amount-v2-umia": "1500000",
      "redemption-claims": { umia: "0", ustx: "0" },
    });
    expect(out.v1mia).toBe(10n);
    expect(out.totalUmia).toBe(11_500_000n);
    expect(out.burnV1).toBe(10n);
    expect(out.redemptionUstx).toBe(2300n);
  });
});

describe("Ccip026Service", () => {
  it("calls get-vote-totals and shapes the result", async () => {
    const client = new FakeClient({
      readOnly: ({ fn }) => {
        if (fn === "get-vote-totals") {
          return {
            mia: {
              "total-amount-yes": "100",
              "total-amount-no": "40",
              "total-votes-yes": "3",
              "total-votes-no": "2",
            },
            totals: {
              "total-amount-yes": "100",
              "total-amount-no": "40",
              "total-votes-yes": "3",
              "total-votes-no": "2",
            },
          };
        }
        throw new Error("unexpected fn " + fn);
      },
    });

    const svc = new Ccip026Service(client);
    const totals = await svc.getVoteTotals();
    expect(totals.yesAmount).toBe(100n);
    expect(totals.noCount).toBe(2);
    expect(client.readOnlyCalls).toHaveLength(1);
    expect(client.readOnlyCalls[0]?.fn).toBe("get-vote-totals");
  });

  it("returns zeroed totals when the contract returns none", async () => {
    const client = new FakeClient({ readOnly: () => null });
    const svc = new Ccip026Service(client);
    const totals = await svc.getVoteTotals();
    expect(totals).toEqual({
      yesAmount: 0n,
      noAmount: 0n,
      yesCount: 0,
      noCount: 0,
    });
  });

  it("looks up user IDs via the registry", async () => {
    const client = new FakeClient({
      readOnly: ({ contract, fn }) => {
        expect(fn).toBe("get-user-id");
        expect(contract.name).toBe("ccd003-user-registry");
        return "42";
      },
    });
    const svc = new Ccip026Service(client);
    expect(await svc.getUserId(userAddress)).toBe(42n);
  });

  it("returns null when the user is not registered", async () => {
    const client = new FakeClient({ readOnly: () => null });
    const svc = new Ccip026Service(client);
    expect(await svc.getUserId(userAddress)).toBeNull();
  });
});

describe("Ccd013Service", () => {
  it("fetches and maps redemption info", async () => {
    const client = new FakeClient({
      readOnly: ({ fn }) => {
        expect(fn).toBe("get-redemption-info");
        return {
          "redemption-enabled": true,
          "block-height": "1",
          "total-supply": "2",
          "mining-treasury-ustx": "3",
          "current-contract-balance": "4",
          "redemption-ratio": "5",
          "total-redeemed": "6",
          "total-transferred": "7",
        };
      },
    });
    const svc = new Ccd013Service(client);
    const info = await svc.getRedemptionInfo();
    expect(info.enabled).toBe(true);
    expect(info.ratio).toBe(5n);
    expect(info.totalTransferred).toBe(7n);
  });

  it("reads treasury STX from /v2/accounts on the rewards contract", async () => {
    const client = new FakeClient({
      account: () => ({
        balance: 1_234_000_000n,
        locked: 0n,
        unlockHeight: 0,
      }),
    });
    const svc = new Ccd013Service(client);
    expect(await svc.getRewardsTreasuryStx()).toBe(1_234_000_000n);
    expect(client.accountCalls[0]).toMatch(
      /SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH\.ccd002-treasury-mia-rewards-v3/,
    );
  });
});
