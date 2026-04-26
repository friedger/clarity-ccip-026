import { CCD013 } from "./config";
import type { ApiTx, ReadOnlyClient } from "./api";

export interface RedemptionEvent {
  txid: string;
  blockHeight: number;
  burnBlockTime: number;
  sender: string;
  burnUmia: bigint;
  burnV1Mia: bigint;
  burnV2Umia: bigint;
  redemptionUstx: bigint;
}

export interface RedemptionPrint {
  burnUmia: bigint;
  burnV1Mia: bigint;
  burnV2Umia: bigint;
  redemptionUstx: bigint;
}

const PAGE_LIMIT = 50;

/**
 * Pure parser for the user-redemption print payload. Exported for unit tests.
 *
 * The Clarity print emits keyword fields like (burn-amount-umia u123). We
 * extract by name rather than fully tokenizing the s-expression so partial
 * payloads still parse if Hiro reorders keys.
 */
export function parseRedemptionPrint(repr: string): RedemptionPrint | null {
  const get = (name: string): bigint | null => {
    const re = new RegExp(`\\(${name}\\s+u(\\d+)\\)`);
    const m = repr.match(re);
    return m ? BigInt(m[1]) : null;
  };
  const burnUmia = get("burn-amount-umia");
  const burnV1Mia = get("burn-amount-v1-mia");
  const burnV2Umia = get("burn-amount-v2-umia");
  const redemptionUstx = get("redemption-amount-ustx");
  if (
    burnUmia == null ||
    burnV1Mia == null ||
    burnV2Umia == null ||
    redemptionUstx == null
  ) {
    return null;
  }
  return { burnUmia, burnV1Mia, burnV2Umia, redemptionUstx };
}

/** Identify which transactions in a page are redeem-mia calls. */
export function isRedeemMiaTx(tx: ApiTx): boolean {
  return (
    tx.tx_status === "success" &&
    tx.tx_type === "contract_call" &&
    tx.contract_call?.function_name === "redeem-mia"
  );
}

export class RedemptionHistoryService {
  constructor(
    private readonly client: ReadOnlyClient,
    private readonly contract = CCD013,
  ) {}

  /**
   * Walks the paginated transactions endpoint up to `pages` times and parses
   * the print event payload from each successful redeem-mia call.
   */
  async list(opts: {
    sender?: string;
    pages?: number;
  } = {}): Promise<RedemptionEvent[]> {
    if (!this.contract.address) return [];
    const maxPages = opts.pages ?? 4;
    const events: RedemptionEvent[] = [];

    for (let i = 0; i < maxPages; i++) {
      const page = await this.client.fetchAddressTransactions(this.contract, {
        limit: PAGE_LIMIT,
        offset: i * PAGE_LIMIT,
      });
      if (!page.results?.length) break;

      for (const tx of page.results) {
        if (!isRedeemMiaTx(tx)) continue;
        if (opts.sender && tx.sender_address !== opts.sender) continue;
        const evt = await this.eventFor(tx);
        if (evt) events.push(evt);
      }

      if (page.results.length < PAGE_LIMIT) break;
    }
    return events;
  }

  private async eventFor(tx: ApiTx): Promise<RedemptionEvent | null> {
    try {
      const data = await this.client.fetchTxEvents(tx.tx_id);
      const userEvent = data.events.find(
        (e) =>
          e.event_type === "smart_contract_log" &&
          e.contract_log?.value?.repr?.includes("user-redemption"),
      );
      const repr = userEvent?.contract_log?.value?.repr;
      if (!repr) return null;
      const parsed = parseRedemptionPrint(repr);
      if (!parsed) return null;
      return {
        txid: tx.tx_id,
        blockHeight: tx.block_height,
        burnBlockTime: tx.burn_block_time,
        sender: tx.sender_address,
        ...parsed,
      };
    } catch {
      return null;
    }
  }
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return "...";
  const d = new Date(unixSeconds * 1000);
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
