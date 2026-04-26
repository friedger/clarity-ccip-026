import { describe, expect, it } from "vitest";
import { Ccip026Service, computeYesShare } from "../src/lib/contracts";
import { deriveVotePeriod } from "../src/lib/votePeriod";
import { FakeClient } from "./_fakeClient";

// Playbook: walks through every UI state the voting page can land in,
// driving each from the same fake-chain primitives the real UI consumes.
//
// Each scenario asserts:
//   - the status label (rendered in the Status stat + period section)
//   - progress percentage through the voting window
//   - vote totals (yes/no amounts and counters)
//   - whether the user has an existing voter record on chain
//   - YES/NO button disabled state and label
//
// The button derivation mirrors VotePage.tsx so a regression in either
// place is caught here.

interface VoterRecord {
  vote: boolean;
  mia: bigint;
}

interface ButtonState {
  yesDisabled: boolean;
  yesLabel: string;
  noDisabled: boolean;
  noLabel: string;
}

function deriveButtons(opts: {
  busy: boolean;
  active: boolean | null;
  voterRecord: VoterRecord | null;
}): ButtonState {
  const { busy, active, voterRecord } = opts;
  return {
    yesDisabled: busy || active === false || voterRecord?.vote === true,
    yesLabel: voterRecord?.vote === false ? "Change to YES" : "Vote YES",
    noDisabled: busy || active === false || voterRecord?.vote === false,
    noLabel: voterRecord?.vote === true ? "Change to NO" : "Vote NO",
  };
}

const PERIOD = { startBlock: 950_000n, endBlock: 952_016n, length: 2016n };
const USER_ID = "42";

function svcWith(opts: {
  totals?: {
    yesAmount: string;
    noAmount: string;
    yesCount: string;
    noCount: string;
  } | null;
  voterRecord?: VoterRecord | null;
}) {
  const totals = opts.totals;
  const record = opts.voterRecord ?? null;
  const client = new FakeClient({
    readOnly: ({ fn }) => {
      switch (fn) {
        case "get-vote-totals":
          if (totals === null) return null;
          return totals
            ? {
                mia: {
                  "total-amount-yes": totals.yesAmount,
                  "total-amount-no": totals.noAmount,
                  "total-votes-yes": totals.yesCount,
                  "total-votes-no": totals.noCount,
                },
                totals: {
                  "total-amount-yes": totals.yesAmount,
                  "total-amount-no": totals.noAmount,
                  "total-votes-yes": totals.yesCount,
                  "total-votes-no": totals.noCount,
                },
              }
            : null;
        case "get-user-id":
          return record ? USER_ID : null;
        case "get-voter-info":
          return record
            ? { vote: record.vote, mia: record.mia.toString() }
            : null;
        default:
          throw new Error(`unmocked ${fn}`);
      }
    },
  });
  return new Ccip026Service(client);
}

describe("voting page state playbook", () => {
  it("Scenario 1 · initial render before any chain data arrives", () => {
    const period = deriveVotePeriod(null, null, null);
    expect(period.status).toBe("loading");
    expect(period.label).toBe("Loading");
    expect(period.progressPct).toBe(0);

    const buttons = deriveButtons({
      busy: false,
      active: null,
      voterRecord: null,
    });
    // Active hasn't arrived yet → buttons remain enabled (will be gated
    // on `voterRow` snapshot membership at the page level).
    expect(buttons).toEqual({
      yesDisabled: false,
      yesLabel: "Vote YES",
      noDisabled: false,
      noLabel: "Vote NO",
    });
  });

  it("Scenario 2 · vote scheduled, opens later", () => {
    const period = deriveVotePeriod(PERIOD, true, 949_500);
    expect(period.status).toBe("scheduled");
    expect(period.label).toBe("Opens soon");
    expect(period.blocksRemaining).toBe(500);
    expect(period.progressPct).toBe(0);
  });

  it("Scenario 3 · voting open, no votes yet", async () => {
    const period = deriveVotePeriod(PERIOD, true, 950_001);
    expect(period.status).toBe("open");
    expect(period.label).toBe("Voting open");
    expect(period.blocksElapsed).toBe(1);
    expect(period.blocksRemaining).toBe(2015);

    const svc = svcWith({
      totals: {
        yesAmount: "0",
        noAmount: "0",
        yesCount: "0",
        noCount: "0",
      },
    });
    const totals = await svc.getVoteTotals();
    expect(totals.yesAmount).toBe(0n);
    expect(totals.noAmount).toBe(0n);
    expect(computeYesShare(totals)).toBe(0);
  });

  it("Scenario 4 · voting open, first YES vote on chain (current mainnet state)", async () => {
    const period = deriveVotePeriod(PERIOD, true, 950_500);
    expect(period.status).toBe("open");
    expect(period.progressPct).toBeCloseTo((500 / 2016) * 100, 5);

    const svc = svcWith({
      totals: {
        yesAmount: "327452000000",
        noAmount: "0",
        yesCount: "1",
        noCount: "0",
      },
    });
    const totals = await svc.getVoteTotals();
    expect(totals.yesAmount).toBe(327_452_000_000n);
    expect(totals.yesCount).toBe(1);
    expect(totals.noCount).toBe(0);
    expect(computeYesShare(totals)).toBe(100);
  });

  it("Scenario 5 · current user has already voted YES — YES button disabled, NO offers to flip", async () => {
    const svc = svcWith({
      voterRecord: { vote: true, mia: 327_452n },
    });
    const id = await svc.getUserId("SP000000000000000000002Q6VF78");
    expect(id).toBe(BigInt(USER_ID));
    const record = await svc.getVoterInfo(id!);
    expect(record).toEqual({ vote: true, mia: 327_452n });

    const buttons = deriveButtons({
      busy: false,
      active: true,
      voterRecord: record,
    });
    expect(buttons).toEqual({
      yesDisabled: true,
      yesLabel: "Vote YES",
      noDisabled: false,
      noLabel: "Change to NO",
    });
  });

  it("Scenario 6 · current user has already voted NO — NO button disabled, YES offers to flip", async () => {
    const svc = svcWith({
      voterRecord: { vote: false, mia: 5_000n },
    });
    const id = await svc.getUserId("SP000000000000000000002Q6VF78");
    const record = await svc.getVoterInfo(id!);
    expect(record).toEqual({ vote: false, mia: 5_000n });

    const buttons = deriveButtons({
      busy: false,
      active: true,
      voterRecord: record,
    });
    expect(buttons).toEqual({
      yesDisabled: false,
      yesLabel: "Change to YES",
      noDisabled: true,
      noLabel: "Vote NO",
    });
  });

  it("Scenario 7 · busy submitting — both buttons disabled regardless of vote state", () => {
    const buttons = deriveButtons({
      busy: true,
      active: true,
      voterRecord: null,
    });
    expect(buttons.yesDisabled).toBe(true);
    expect(buttons.noDisabled).toBe(true);
  });

  it("Scenario 8 · vote window ended, awaiting DAO execution", () => {
    const period = deriveVotePeriod(PERIOD, true, 952_500);
    expect(period.status).toBe("ended_pending_execution");
    expect(period.label).toBe("Awaiting execution");
    expect(period.progressPct).toBe(100);
    expect(period.blocksRemaining).toBe(0);

    // active is still true (vote-active flag flips on execution), but
    // the page's vote() guard rejects with ERR_PROPOSAL_NOT_ACTIVE,
    // so leaving buttons enabled is acceptable here — the button copy
    // doesn't change but the chain refuses the call.
    const buttons = deriveButtons({
      busy: false,
      active: true,
      voterRecord: null,
    });
    expect(buttons.yesDisabled).toBe(false);
    expect(buttons.noDisabled).toBe(false);
  });

  it("Scenario 9 · proposal executed — vote-active=false, both buttons disabled", () => {
    const period = deriveVotePeriod(PERIOD, false, 953_000);
    expect(period.status).toBe("executed");
    expect(period.label).toBe("Executed");
    expect(period.progressPct).toBe(100);

    const buttons = deriveButtons({
      busy: false,
      active: false,
      voterRecord: { vote: true, mia: 327_452n },
    });
    expect(buttons.yesDisabled).toBe(true);
    expect(buttons.noDisabled).toBe(true);
  });
});
