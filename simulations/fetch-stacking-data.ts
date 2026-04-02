/**
 * Fetch MIA stacking data for cycles 82 and 83 from Stacks mainnet.
 *
 * Queries ccd007-citycoin-stacking.get-stacker at the block heights
 * corresponding to the start of each cycle:
 *   Cycle 82: STX block 145,643
 *   Cycle 83: STX block 147,282
 *
 * Outputs data/stacking-data.ts with all users that have non-zero stacking
 * in either cycle.
 *
 * Usage:
 *   npx tsx simulations/fetch-stacking-data.ts
 *   HIRO_API_KEY=... npx tsx simulations/fetch-stacking-data.ts
 */

import {
  Cl,
  serializeCV,
  deserializeCV,
  cvToString,
  ClarityType,
  type ClarityValue,
} from "@stacks/transactions";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HIRO_API = process.env.HIRO_API_URL || "http://localhost:3999";
const API_KEY = process.env.HIRO_API_KEY;
const CONTRACT_ADDR = "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH";

const MIA_ID = 1;
const CYCLE_82_STX_HEIGHT = 145643;
const CYCLE_83_STX_HEIGHT = 147282;

const DELAY_MS = 200; // ms between batches
const BATCH_SIZE = 5; // parallel requests per batch
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHexArg(cv: ClarityValue): string {
  const hex = serializeCV(cv);
  if (typeof hex === "string") {
    return hex.startsWith("0x") ? hex : "0x" + hex;
  }
  // Uint8Array fallback
  const arr = new Uint8Array(hex as unknown as ArrayBuffer);
  return (
    "0x" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function requestHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["x-hiro-api-key"] = API_KEY;
  return h;
}

function extractPrincipal(cv: ClarityValue): string | null {
  if (cv.type === ClarityType.OptionalSome) {
    const inner = (cv as any).value;
    const s = cvToString(inner);
    return s.startsWith("'") ? s.slice(1) : s;
  }
  if (cv.type === ClarityType.OptionalNone) {
    return null;
  }
  const s = cvToString(cv);
  return s.startsWith("'") ? s.slice(1) : s;
}

function extractUint(cv: ClarityValue): bigint {
  const v = (cv as any).value;
  if (typeof v === "bigint") return v;
  return BigInt(v);
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, init);
    if (response.status === 429) {
      const wait = attempt * 5000;
      console.warn(`Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`);
      await sleep(wait);
      continue;
    }
    return response;
  }
  throw new Error(`Failed after ${retries} retries (rate limited)`);
}

async function callReadOnly(
  contractName: string,
  functionName: string,
  args: ClarityValue[],
  tip?: string
): Promise<ClarityValue> {
  const hexArgs = args.map(toHexArg);
  let url = `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDR}/${contractName}/${functionName}`;
  if (tip) url += `?tip=${tip}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({
      sender: "SP000000000000000000002Q6VF78",
      arguments: hexArgs,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.okay) {
    throw new Error(`Contract call failed: ${JSON.stringify(data)}`);
  }

  return deserializeCV(data.result);
}

async function getBlockHash(height: number): Promise<string> {
  const response = await fetchWithRetry(
    `${HIRO_API}/extended/v2/blocks/${height}`,
    { headers: requestHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to get block ${height}: ${await response.text()}`);
  }
  const data = await response.json();
  // Strip 0x prefix — the ?tip parameter does not accept it
  return (data.index_block_hash as string).replace(/^0x/, "");
}

// ---------------------------------------------------------------------------
// Find max user ID via binary search
// ---------------------------------------------------------------------------

async function userExists(userId: number): Promise<boolean> {
  const result = await callReadOnly("ccd003-user-registry", "get-user", [
    Cl.uint(userId),
  ]);
  return result.type !== ClarityType.OptionalNone;
}

async function findMaxUserId(): Promise<number> {
  // Find upper bound
  let high = 1000;
  while (await userExists(high)) {
    await sleep(DELAY_MS);
    high *= 2;
    console.log(`  Probing userId ${high}...`);
  }

  // Binary search
  let low = Math.floor(high / 2);
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    await sleep(DELAY_MS);
    if (await userExists(mid)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

interface StackingEntry {
  userId: number;
  address: string;
  cycle82Stacked: bigint;
  cycle83Stacked: bigint;
}

async function getStacking(
  userId: number,
  cycle: number,
  tip: string
): Promise<bigint> {
  const result = await callReadOnly(
    "ccd007-citycoin-stacking",
    "get-stacker",
    [Cl.uint(MIA_ID), Cl.uint(cycle), Cl.uint(userId)],
    tip
  );
  // get-stacker returns a tuple { stacked: uint, claimable: uint }
  const tuple = result as any;
  if (tuple.value && tuple.value.stacked) {
    return extractUint(tuple.value.stacked);
  } else {
    throw new Error(`Unexpected get-stacker result for user ${userId}, cycle ${cycle}: ${cvToString(result)}`);
  }
}

async function getUserPrincipal(userId: number): Promise<string | null> {
  const result = await callReadOnly("ccd003-user-registry", "get-user", [
    Cl.uint(userId),
  ]);
  return extractPrincipal(result);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Fetching MIA Stacking Data from Mainnet ===\n");

  // Step 1: Get block hashes
  console.log("Step 1: Fetching block hashes...");
  const cycle82Hash = await getBlockHash(CYCLE_82_STX_HEIGHT);
  await sleep(DELAY_MS);
  const cycle83Hash = await getBlockHash(CYCLE_83_STX_HEIGHT);
  console.log(`  Cycle 82 (STX ${CYCLE_82_STX_HEIGHT}): ${cycle82Hash}`);
  console.log(`  Cycle 83 (STX ${CYCLE_83_STX_HEIGHT}): ${cycle83Hash}`);

  // Step 2: Find max user ID
  console.log("\nStep 2: Finding total user count...");
  const maxUserId = await findMaxUserId();
  console.log(`  Max user ID: ${maxUserId}`);

  // Step 3: Query stacking data for all users
  console.log(`\nStep 3: Querying stacking data for users 1-${maxUserId}...`);
  const results: StackingEntry[] = [];

  for (let batchStart = 1; batchStart <= maxUserId; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, maxUserId);
    const userIds = Array.from(
      { length: batchEnd - batchStart + 1 },
      (_, i) => batchStart + i
    );

    if (batchStart % 50 === 1 || batchStart === 1) {
      console.log(
        `  Processing users ${batchStart}-${batchEnd} of ${maxUserId}...`
      );
    }

    // Query cycle 82 + 83 for all users in this batch in parallel
    const batchResults = await Promise.all(
      userIds.map(async (userId) => {
        if (userId===23){
          console.log(`Debug: Fetching stacking for user ${userId}...`);
        }
        try {
          const [stacked82, stacked83] = await Promise.all([
            getStacking(userId, 82, cycle82Hash),
            getStacking(userId, 83, cycle83Hash),
          ]);
          return { userId, stacked82, stacked83 };
        } catch (err: any) {
          console.warn(`  Error for user ${userId}, retrying: ${err.message}`);
          await sleep(DELAY_MS * 5);
          const [stacked82, stacked83] = await Promise.all([
            getStacking(userId, 82, cycle82Hash),
            getStacking(userId, 83, cycle83Hash),
          ]);
          return { userId, stacked82, stacked83 };
        }
      })
    );

    // For users with non-zero stacking, get their principal
    for (const { userId, stacked82, stacked83 } of batchResults) {
      if (stacked82 === 0n && stacked83 === 0n) continue;

      await sleep(DELAY_MS);
      const address = await getUserPrincipal(userId);
      if (!address) {
        console.warn(`  User ${userId} has stacking but no registry entry!`);
        throw new Error(`User ${userId} has stacking but no registry entry`);
      }

      if (userId===23){
        console.log(`Debug: User ${userId} has address ${address}, cycle82=${stacked82}, cycle83=${stacked83}`);
      }
      results.push({
        userId,
        address,
        cycle82Stacked: stacked82,
        cycle83Stacked: stacked83,
      });

      console.log(
        `  ✓ User ${userId} (${address}): cycle82=${stacked82}, cycle83=${stacked83}`
      );
    }

    await sleep(DELAY_MS);
  }

  // Step 4: Write output file
  console.log(`\nStep 4: Writing data/stacking-data.ts (${results.length} entries)...`);

  // Sort by address for deterministic output
  results.sort((a, b) => a.address.localeCompare(b.address));

  const lines = [
    "// ---------------------------------------------------------------------------",
    "// Stacking data — auto-generated by simulations/fetch-stacking-data.ts",
    "// ---------------------------------------------------------------------------",
    "",
    "/**",
    " * MIA stacking data for cycles 82 and 83, fetched from mainnet.",
    " *",
    " * Each entry represents a user's stacking amounts:",
    " *   Cycle 82: at STX block 145,643 (BTC 838,250)",
    " *   Cycle 83: at STX block 147,282 (BTC 840,350)",
    " *",
    " * Source: ccd007-citycoin-stacking.get-stacker(u1, cycle, userId)",
    " * Principal: ccd003-user-registry.get-user(userId)",
    " */",
    "export const stackingData: {",
    "  address: string;",
    "  cycle82Stacked: bigint;",
    "  cycle83Stacked: bigint;",
    "}[] = [",
  ];

  for (const entry of results) {
    lines.push("  {");
    lines.push(`    address: "${entry.address}",`);
    lines.push(`    cycle82Stacked: ${entry.cycle82Stacked}n,`);
    lines.push(`    cycle83Stacked: ${entry.cycle83Stacked}n,`);
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");

  const outPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "data",
    "stacking-data.ts"
  );
  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`  Written to ${outPath}`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total users checked: ${maxUserId}`);
  console.log(`Users with non-zero stacking: ${results.length}`);
  let totalC82 = 0n;
  let totalC83 = 0n;
  for (const r of results) {
    totalC82 += r.cycle82Stacked;
    totalC83 += r.cycle83Stacked;
  }
  console.log(`Total cycle 82 stacked: ${totalC82}`);
  console.log(`Total cycle 83 stacked: ${totalC83}`);
}

main().catch(console.error);
