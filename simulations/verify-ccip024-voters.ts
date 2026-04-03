/**
 * Verify ccip024 voter print events against stacking-data averages.
 *
 * Fetches all vote print events from the mainnet ccip024-miamicoin-signal-vote
 * contract, resolves the sender of each transaction, and compares the `mia`
 * voting power in the event against the `average` field in data/stacking-data.ts.
 *
 * Usage:
 *   npx tsx simulations/verify-ccip024-voters.ts
 *   HIRO_API_KEY=... npx tsx simulations/verify-ccip024-voters.ts
 */

import { stackingData } from "../data/stacking-data";

const HIRO_API = "https://api.hiro.so";
const API_KEY = process.env.HIRO_API_KEY;
const CONTRACT =
  "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccip024-miamicoin-signal-vote";

function requestHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["x-hiro-api-key"] = API_KEY;
  return h;
}

interface VoteEvent {
  tx_id: string;
  mia: bigint;
}

async function fetchVoteEvents(): Promise<VoteEvent[]> {
  const events: VoteEvent[] = [];
  const headers = requestHeaders();

  for (let offset = 0; ; offset += 50) {
    const res = await fetch(
      `${HIRO_API}/extended/v1/contract/${CONTRACT}/events?limit=50&offset=${offset}`,
      { headers },
    );
    const data = await res.json();

    for (const e of data.results) {
      if (e.event_type !== "smart_contract_log") continue;
      const match = e.contract_log.value.repr.match(/mia u(\d+)/);
      if (match) events.push({ tx_id: e.tx_id, mia: BigInt(match[1]) });
    }

    if (data.results.length < 50) break;
  }

  return events;
}

async function getSenderAddress(txId: string): Promise<string> {
  const res = await fetch(`${HIRO_API}/extended/v1/tx/${txId}`, {
    headers: requestHeaders(),
  });
  const tx = await res.json();
  return tx.sender_address;
}

async function main() {
  console.log("Fetching ccip024 vote events from mainnet...\n");
  const events = await fetchVoteEvents();
  console.log(`Found ${events.length} vote events.\n`);

  let matches = 0;
  let mismatches = 0;
  let notFound = 0;

  for (const { tx_id, mia } of events) {
    const address = await getSenderAddress(tx_id);
    const entry = stackingData.find((e) => e.address === address);

    if (!entry) {
      console.log(`NOT FOUND: ${address} (ccip024 mia=${mia})`);
      notFound++;
      continue;
    }

    if (entry.average === mia) {
      matches++;
    } else {
      console.log(`MISMATCH: ${address}`);
      console.log(`  ccip024 mia:      ${mia}`);
      console.log(`  stacking average: ${entry.average}`);
      console.log(`  cycle82:          ${entry.cycle82Stacked}`);
      console.log(`  cycle83:          ${entry.cycle83Stacked}`);
      mismatches++;
    }
  }

  console.log("\n=== Verification Summary ===");
  console.log(`Total ccip024 voters: ${events.length}`);
  console.log(`Matches:              ${matches}`);
  console.log(`Mismatches:           ${mismatches}`);
  console.log(`Not in stacking data: ${notFound}`);
}

main().catch(console.error);
