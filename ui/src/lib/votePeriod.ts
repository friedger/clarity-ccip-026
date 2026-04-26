import type { VotePeriod } from "./contracts";

export type VoteStatus =
  | "loading"
  | "scheduled"
  | "open"
  | "ended_pending_execution"
  | "executed";

export interface VotePeriodView {
  status: VoteStatus;
  /** Human-readable label rendered in the Status stat. */
  label: string;
  /** 0..100 progress through the voting window. */
  progressPct: number;
  /** Bitcoin blocks elapsed since vote start (clamped >= 0). */
  blocksElapsed: number;
  /** Bitcoin blocks remaining until vote end (clamped >= 0). */
  blocksRemaining: number;
}

/**
 * Pure derivation of vote period state from on-chain values.
 * Inputs are nullable so we can render a skeleton while loading.
 */
export function deriveVotePeriod(
  period: VotePeriod | null,
  voteActive: boolean | null,
  burnHeight: number | null,
): VotePeriodView {
  if (!period || burnHeight == null) {
    return {
      status: "loading",
      label: "Loading",
      progressPct: 0,
      blocksElapsed: 0,
      blocksRemaining: 0,
    };
  }

  const start = Number(period.startBlock);
  const end = Number(period.endBlock);
  const length = Math.max(end - start, 1);
  const elapsed = Math.max(0, Math.min(length, burnHeight - start));
  const remaining = Math.max(0, end - burnHeight);
  const progressPct = Math.max(0, Math.min(100, (elapsed / length) * 100));

  if (voteActive === false) {
    return {
      status: "executed",
      label: "Executed",
      progressPct: 100,
      blocksElapsed: length,
      blocksRemaining: 0,
    };
  }

  if (burnHeight < start) {
    return {
      status: "scheduled",
      label: "Opens soon",
      progressPct: 0,
      blocksElapsed: 0,
      blocksRemaining: start - burnHeight,
    };
  }

  if (burnHeight > end) {
    return {
      status: "ended_pending_execution",
      label: "Awaiting execution",
      progressPct: 100,
      blocksElapsed: length,
      blocksRemaining: 0,
    };
  }

  return {
    status: "open",
    label: "Voting open",
    progressPct,
    blocksElapsed: elapsed,
    blocksRemaining: remaining,
  };
}

/**
 * Roughly translates a Bitcoin block count to wall-clock time at 10 min/block.
 * Used only for UI hints.
 */
export function approxDuration(blocks: number): string {
  if (blocks <= 0) return "0";
  const minutes = blocks * 10;
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = hours / 24;
  if (days < 7) {
    const d = Math.round(days);
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  const weeks = days / 7;
  const w = Math.round(weeks * 10) / 10;
  return `${w} week${w === 1 ? "" : "s"}`;
}
