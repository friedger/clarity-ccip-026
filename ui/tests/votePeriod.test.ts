import { describe, expect, it } from "vitest";
import { approxDuration, deriveVotePeriod } from "../src/lib/votePeriod";

const period = { startBlock: 100n, endBlock: 200n, length: 100n };

describe("deriveVotePeriod", () => {
  it("returns loading when inputs are missing", () => {
    expect(deriveVotePeriod(null, null, null).status).toBe("loading");
    expect(deriveVotePeriod(period, true, null).status).toBe("loading");
  });

  it("reports scheduled when current height is before start", () => {
    const v = deriveVotePeriod(period, true, 50);
    expect(v.status).toBe("scheduled");
    expect(v.label).toBe("Opens soon");
    expect(v.progressPct).toBe(0);
    expect(v.blocksRemaining).toBe(50);
  });

  it("reports voting open during the window", () => {
    const v = deriveVotePeriod(period, true, 150);
    expect(v.status).toBe("open");
    expect(v.label).toBe("Voting open");
    expect(v.progressPct).toBe(50);
    expect(v.blocksElapsed).toBe(50);
    expect(v.blocksRemaining).toBe(50);
  });

  it("reports awaiting execution past the end while still active", () => {
    const v = deriveVotePeriod(period, true, 250);
    expect(v.status).toBe("ended_pending_execution");
    expect(v.label).toBe("Awaiting execution");
    expect(v.progressPct).toBe(100);
    expect(v.blocksRemaining).toBe(0);
  });

  it("reports executed when active flag is false", () => {
    const v = deriveVotePeriod(period, false, 150);
    expect(v.status).toBe("executed");
    expect(v.label).toBe("Executed");
    expect(v.progressPct).toBe(100);
  });

  it("clamps progress to [0, 100]", () => {
    expect(deriveVotePeriod(period, true, 0).progressPct).toBe(0);
    expect(deriveVotePeriod(period, true, 999).progressPct).toBe(100);
  });
});

describe("approxDuration", () => {
  it("renders sub-hour windows in minutes", () => {
    expect(approxDuration(3)).toBe("30 min");
  });
  it("renders multi-hour windows in hours", () => {
    expect(approxDuration(12)).toBe("2 hours");
    expect(approxDuration(6)).toBe("1 hour");
  });
  it("renders multi-day windows in days", () => {
    expect(approxDuration(144 * 3)).toBe("3 days");
  });
  it("renders week-scale windows in decimal weeks", () => {
    expect(approxDuration(2016)).toMatch(/weeks?$/);
  });
  it("returns 0 for non-positive input", () => {
    expect(approxDuration(0)).toBe("0");
    expect(approxDuration(-5)).toBe("0");
  });
});
