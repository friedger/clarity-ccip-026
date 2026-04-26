import { HiroClient, type ReadOnlyClient } from "./api";
import {
  Ccd013Service,
  Ccip026Service,
} from "./contracts";
import { RedemptionHistoryService } from "./history";

let client: ReadOnlyClient = new HiroClient();
let ccip026 = new Ccip026Service(client);
let ccd013 = new Ccd013Service(client);
let history = new RedemptionHistoryService(client);

export function getReadOnlyClient(): ReadOnlyClient {
  return client;
}

/**
 * Swap the read-only client (used by tests). Rebuilds dependent services so
 * subsequent getCcip026()/getCcd013()/getHistory() calls use the new client.
 */
export function setReadOnlyClient(next: ReadOnlyClient): void {
  client = next;
  ccip026 = new Ccip026Service(next);
  ccd013 = new Ccd013Service(next);
  history = new RedemptionHistoryService(next);
}

export const getCcip026 = (): Ccip026Service => ccip026;
export const getCcd013 = (): Ccd013Service => ccd013;
export const getHistory = (): RedemptionHistoryService => history;
