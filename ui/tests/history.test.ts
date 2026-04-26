import { describe, expect, it } from "vitest";
import {
  RedemptionHistoryService,
  isRedeemMiaTx,
  parseRedemptionPrint,
} from "../src/lib/history";
import type { ApiTx } from "../src/lib/api";
import { CCD013 } from "../src/lib/config";
import { FakeClient } from "./_fakeClient";

const PRINT_REPR =
  "(tuple (notification \"user-redemption\") (payload (tuple " +
  "(address 'SP123) " +
  "(burn-amount-umia u11500000) " +
  "(burn-amount-v1-mia u10) " +
  "(burn-amount-v2-umia u1500000) " +
  "(redemption-amount-ustx u2300) " +
  "(redemption-claims (tuple (umia u0) (ustx u0))))))";

describe("parseRedemptionPrint", () => {
  it("extracts each amount field by keyword", () => {
    const parsed = parseRedemptionPrint(PRINT_REPR);
    expect(parsed).toEqual({
      burnUmia: 11_500_000n,
      burnV1Mia: 10n,
      burnV2Umia: 1_500_000n,
      redemptionUstx: 2300n,
    });
  });

  it("returns null when any field is missing", () => {
    expect(parseRedemptionPrint("(tuple (notification \"user-redemption\"))")).toBeNull();
  });

  it("tolerates field reordering", () => {
    const reordered =
      "(tuple " +
      "(redemption-amount-ustx u9000) " +
      "(burn-amount-v1-mia u0) " +
      "(burn-amount-umia u9999999) " +
      "(burn-amount-v2-umia u9999999))";
    const parsed = parseRedemptionPrint(reordered);
    expect(parsed?.redemptionUstx).toBe(9000n);
    expect(parsed?.burnUmia).toBe(9_999_999n);
  });
});

describe("isRedeemMiaTx", () => {
  it("accepts only successful redeem-mia contract calls", () => {
    expect(
      isRedeemMiaTx({
        tx_id: "0x1",
        tx_status: "success",
        block_height: 1,
        burn_block_time: 1,
        sender_address: "SP",
        tx_type: "contract_call",
        contract_call: { function_name: "redeem-mia" },
      }),
    ).toBe(true);
  });

  it("rejects failed transactions", () => {
    expect(
      isRedeemMiaTx({
        tx_id: "0x1",
        tx_status: "abort_by_post_condition",
        block_height: 1,
        burn_block_time: 1,
        sender_address: "SP",
        tx_type: "contract_call",
        contract_call: { function_name: "redeem-mia" },
      }),
    ).toBe(false);
  });

  it("rejects other functions on the same contract", () => {
    expect(
      isRedeemMiaTx({
        tx_id: "0x1",
        tx_status: "success",
        block_height: 1,
        burn_block_time: 1,
        sender_address: "SP",
        tx_type: "contract_call",
        contract_call: { function_name: "initialize-redemption" },
      }),
    ).toBe(false);
  });
});

function tx(overrides: Partial<ApiTx> & { id: string; sender: string }): ApiTx {
  return {
    tx_id: overrides.id,
    tx_status: "success",
    block_height: 100,
    burn_block_time: 1700000000,
    sender_address: overrides.sender,
    tx_type: "contract_call",
    contract_call: { function_name: "redeem-mia" },
    ...overrides,
  };
}

describe("RedemptionHistoryService", () => {
  it("returns empty list when contract address is unconfigured", async () => {
    const client = new FakeClient();
    const svc = new RedemptionHistoryService(client, {
      address: "",
      name: "ccd013-burn-to-exit-mia",
    });
    expect(await svc.list()).toEqual([]);
    expect(client.txListCalls).toHaveLength(0);
  });

  it("filters by sender and parses the print event", async () => {
    const client = new FakeClient({
      transactions: () => ({
        results: [
          tx({ id: "0xaaa", sender: "SP_ALICE" }),
          tx({ id: "0xbbb", sender: "SP_BOB" }),
        ],
        total: 2,
      }),
      events: (txid) => ({
        events: [
          {
            event_type: "smart_contract_log",
            contract_log: {
              contract_id: `${CCD013.address}.${CCD013.name}`,
              value: { repr: PRINT_REPR.replace("u11500000", `u${txid === "0xaaa" ? 10 : 20}000000`) },
            },
          },
        ],
      }),
    });

    const svc = new RedemptionHistoryService(client, {
      address: "SP_DEPLOYER",
      name: "ccd013-burn-to-exit-mia",
    });

    const all = await svc.list();
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.sender).sort()).toEqual(["SP_ALICE", "SP_BOB"]);

    const onlyAlice = await svc.list({ sender: "SP_ALICE" });
    expect(onlyAlice).toHaveLength(1);
    expect(onlyAlice[0]?.sender).toBe("SP_ALICE");
    expect(onlyAlice[0]?.burnUmia).toBe(10_000_000n);
  });

  it("skips non-redeem-mia transactions", async () => {
    const client = new FakeClient({
      transactions: () => ({
        results: [
          {
            tx_id: "0x1",
            tx_status: "success",
            block_height: 1,
            burn_block_time: 1,
            sender_address: "SP",
            tx_type: "contract_call",
            contract_call: { function_name: "initialize-redemption" },
          },
        ],
        total: 1,
      }),
      events: () => ({ events: [] }),
    });

    const svc = new RedemptionHistoryService(client, {
      address: "SP_DEPLOYER",
      name: "ccd013-burn-to-exit-mia",
    });
    expect(await svc.list()).toEqual([]);
    expect(client.eventCalls).toHaveLength(0);
  });

  it("stops paging when the contract returns a partial page", async () => {
    let pageCount = 0;
    const client = new FakeClient({
      transactions: () => {
        pageCount++;
        return {
          results: [tx({ id: "0xaaa", sender: "SP_ALICE" })],
          total: 1,
        };
      },
      events: () => ({
        events: [
          {
            event_type: "smart_contract_log",
            contract_log: {
              contract_id: `${CCD013.address}.${CCD013.name}`,
              value: { repr: PRINT_REPR },
            },
          },
        ],
      }),
    });

    const svc = new RedemptionHistoryService(client, {
      address: "SP_DEPLOYER",
      name: "ccd013-burn-to-exit-mia",
    });
    await svc.list({ pages: 5 });
    expect(pageCount).toBe(1);
  });
});
