import {
  ClarityType,
  fetchCallReadOnlyFunction,
  type ClarityValue,
} from "@stacks/transactions";
import { HIRO_API, STACKS_NETWORK } from "./config";

// Recursively unwraps a ClarityValue into plain JS. Replaces
// `cvToValue(cv, true)` from @stacks/transactions, which (since v7) wraps
// every nested value in `{type, value}` envelopes — producing shapes the
// rest of the UI cannot read. Mirrors the v6 "strict JSON" output:
// optionals collapse to inner-value-or-null, tuples to flat objects,
// uints to decimal strings, buffers to 0x-prefixed hex.
export function unwrapCv(cv: ClarityValue): unknown {
  switch (cv.type) {
    case ClarityType.BoolTrue:
      return true;
    case ClarityType.BoolFalse:
      return false;
    case ClarityType.Int:
    case ClarityType.UInt:
      return cv.value.toString();
    case ClarityType.Buffer:
      return `0x${cv.value}`;
    case ClarityType.OptionalNone:
      return null;
    case ClarityType.OptionalSome:
    case ClarityType.ResponseOk:
    case ClarityType.ResponseErr:
      return unwrapCv(cv.value);
    case ClarityType.PrincipalStandard:
    case ClarityType.PrincipalContract:
      return cv.value;
    case ClarityType.List:
      return cv.value.map(unwrapCv);
    case ClarityType.Tuple: {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(cv.value)) {
        out[k] = unwrapCv(cv.value[k]);
      }
      return out;
    }
    case ClarityType.StringASCII:
    case ClarityType.StringUTF8:
      return cv.value;
  }
}

export interface ContractRef {
  address: string;
  name: string;
}

export interface AccountState {
  balance: bigint;
  locked: bigint;
  unlockHeight: number;
}

export interface ApiTx {
  tx_id: string;
  tx_status: string;
  block_height: number;
  burn_block_time: number;
  sender_address: string;
  tx_type: string;
  contract_call?: { function_name: string };
}

export interface ApiEvent {
  event_type: string;
  contract_log?: {
    contract_id: string;
    value: { repr: string; hex?: string };
    topic?: string;
  };
}

export interface ApiTxList {
  results: ApiTx[];
  total: number;
}

/** All on-chain reads go through this interface. Inject a fake in tests. */
export interface ReadOnlyClient {
  callReadOnly<T = unknown>(
    contract: ContractRef,
    fn: string,
    args?: ClarityValue[],
  ): Promise<T>;
  fetchAccount(addressOrContract: string): Promise<AccountState>;
  fetchAddressTransactions(
    contract: ContractRef,
    opts?: { limit?: number; offset?: number },
  ): Promise<ApiTxList>;
  fetchTxEvents(txid: string): Promise<{ events: ApiEvent[] }>;
  fetchBurnBlockHeight(): Promise<number>;
}

const NULL_SENDER = "SP000000000000000000002Q6VF78";

/** Production client backed by Hiro's mainnet API. */
export class HiroClient implements ReadOnlyClient {
  constructor(
    private readonly baseUrl: string = HIRO_API,
    private readonly network: typeof STACKS_NETWORK = STACKS_NETWORK,
    private readonly fetchImpl: typeof fetch = fetch.bind(globalThis),
  ) {}

  async callReadOnly<T>(
    contract: ContractRef,
    fn: string,
    args: ClarityValue[] = [],
  ): Promise<T> {
    if (!contract.address) {
      throw new Error(
        "Contract deployer address not configured (set VITE_CCIP_DEPLOYER).",
      );
    }
    const cv = await fetchCallReadOnlyFunction({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName: fn,
      functionArgs: args,
      network: this.network,
      senderAddress: NULL_SENDER,
      client: { baseUrl: this.baseUrl },
    });
    return unwrapCv(cv) as T;
  }

  async fetchAccount(target: string): Promise<AccountState> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/v2/accounts/${target}?proof=0`,
    );
    if (!res.ok) throw new Error(`account ${target}: ${res.status}`);
    const json = await res.json();
    return {
      balance: BigInt(json.balance ?? "0x0"),
      locked: BigInt(json.locked ?? "0x0"),
      unlockHeight: Number(json.unlock_height ?? 0),
    };
  }

  async fetchAddressTransactions(
    contract: ContractRef,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<ApiTxList> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const url = `${this.baseUrl}/extended/v1/address/${contract.address}.${contract.name}/transactions?limit=${limit}&offset=${offset}`;
    const res = await this.fetchImpl(url);
    if (!res.ok) throw new Error(`tx list ${contract.name}: ${res.status}`);
    return (await res.json()) as ApiTxList;
  }

  async fetchTxEvents(txid: string): Promise<{ events: ApiEvent[] }> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/extended/v1/tx/${txid}/events?limit=50`,
    );
    if (!res.ok) throw new Error(`events ${txid}: ${res.status}`);
    return (await res.json()) as { events: ApiEvent[] };
  }

  async fetchBurnBlockHeight(): Promise<number> {
    const res = await this.fetchImpl(`${this.baseUrl}/v2/info`);
    if (!res.ok) throw new Error(`info: ${res.status}`);
    const json = await res.json();
    return Number(json.burn_block_height ?? 0);
  }
}
