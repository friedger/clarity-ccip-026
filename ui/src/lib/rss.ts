import { CCD013, MIA_REWARDS_TREASURY } from "./config";
import { formatUMia, formatUStx } from "./format";
import type { RedemptionEvent } from "./history";

const FEED_TITLE = "CCIP-026 · MiamiCoin Burn to Exit · Redemptions";

interface FeedOptions {
  /** Public origin where the UI is hosted. Used to build entry links. */
  origin: string;
  /** ISO timestamp used for the feed's `updated` field. Defaults to now. */
  updated?: Date;
}

/**
 * Build an Atom 1.0 feed from a list of redemption events.
 *
 * Pure function: no DOM, no network, no globals. Easy to unit test.
 */
export function buildRedemptionAtom(
  events: RedemptionEvent[],
  opts: FeedOptions,
): string {
  const updated = (opts.updated ?? new Date()).toISOString();
  const selfId = `${opts.origin.replace(/\/$/, "")}/#/history`;

  const entries = events
    .slice()
    .sort((a, b) => b.burnBlockTime - a.burnBlockTime)
    .map((e) => entryXml(e, opts.origin))
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom">`,
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <id>${escapeXml(selfId)}</id>`,
    `  <link rel="alternate" href="${escapeXml(selfId)}"/>`,
    `  <updated>${updated}</updated>`,
    `  <generator>ccip-026-ui</generator>`,
    `  <subtitle>${escapeXml(
      `Burn-and-redeem activity on ${CCD013.address || "<deployer>"}.${CCD013.name}. Treasury: ${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}.`,
    )}</subtitle>`,
    entries,
    `</feed>`,
  ].join("\n");
}

function entryXml(e: RedemptionEvent, origin: string): string {
  const explorer = `https://explorer.hiro.so/txid/${e.txid}?chain=mainnet`;
  const id = `urn:stacks:tx:${e.txid}`;
  const updated = new Date(e.burnBlockTime * 1000).toISOString();
  const title = `${formatUMia(e.burnUmia, 2)} MIA → ${formatUStx(
    e.redemptionUstx,
  )} STX`;
  const summary =
    `${e.sender} burnt ${formatUMia(e.burnUmia, 2)} MIA ` +
    `(v1: ${e.burnV1Mia.toString()} MIA, ` +
    `v2: ${formatUMia(e.burnV2Umia, 2)} MIA) ` +
    `and received ${formatUStx(e.redemptionUstx)} STX in block ${e.blockHeight}.`;
  return [
    `  <entry>`,
    `    <id>${escapeXml(id)}</id>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <updated>${updated}</updated>`,
    `    <author><name>${escapeXml(e.sender)}</name></author>`,
    `    <link rel="alternate" href="${escapeXml(explorer)}"/>`,
    `    <link rel="related" href="${escapeXml(
      `${origin.replace(/\/$/, "")}/#/history`,
    )}"/>`,
    `    <summary>${escapeXml(summary)}</summary>`,
    `  </entry>`,
  ].join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Browser helper: triggers a file download for the given Atom XML. */
export function downloadAtom(xml: string, filename = "ccip-026-redemptions.xml"): void {
  const blob = new Blob([xml], { type: "application/atom+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
