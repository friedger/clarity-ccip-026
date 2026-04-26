import type { ClarityValue } from "@stacks/transactions";
import type {
  AccountState,
  ApiTxList,
  ApiEvent,
  ContractRef,
  ReadOnlyClient,
} from "../src/lib/api";

export interface FakeCall {
  contract: ContractRef;
  fn: string;
  args: ClarityValue[];
}

export interface FakeClientOptions {
  readOnly?: (call: FakeCall) => unknown;
  account?: (target: string) => AccountState;
  transactions?: (
    contract: ContractRef,
    opts: { limit: number; offset: number },
  ) => ApiTxList;
  events?: (txid: string) => { events: ApiEvent[] };
  burnBlockHeight?: () => number;
}

/** Test double for ReadOnlyClient. Records every call for assertions. */
export class FakeClient implements ReadOnlyClient {
  readonly readOnlyCalls: FakeCall[] = [];
  readonly accountCalls: string[] = [];
  readonly txListCalls: Array<{ contract: ContractRef; offset: number }> = [];
  readonly eventCalls: string[] = [];

  constructor(private readonly opts: FakeClientOptions = {}) {}

  async callReadOnly<T>(
    contract: ContractRef,
    fn: string,
    args: ClarityValue[] = [],
  ): Promise<T> {
    const call = { contract, fn, args };
    this.readOnlyCalls.push(call);
    if (!this.opts.readOnly) throw new Error(`unmocked read-only ${fn}`);
    return this.opts.readOnly(call) as T;
  }

  async fetchAccount(target: string): Promise<AccountState> {
    this.accountCalls.push(target);
    if (!this.opts.account) throw new Error(`unmocked account ${target}`);
    return this.opts.account(target);
  }

  async fetchAddressTransactions(
    contract: ContractRef,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<ApiTxList> {
    const offset = opts.offset ?? 0;
    this.txListCalls.push({ contract, offset });
    if (!this.opts.transactions)
      throw new Error(`unmocked tx list ${contract.name}`);
    return this.opts.transactions(contract, {
      limit: opts.limit ?? 50,
      offset,
    });
  }

  async fetchTxEvents(txid: string): Promise<{ events: ApiEvent[] }> {
    this.eventCalls.push(txid);
    if (!this.opts.events) throw new Error(`unmocked events ${txid}`);
    return this.opts.events(txid);
  }

  async fetchBurnBlockHeight(): Promise<number> {
    if (!this.opts.burnBlockHeight) throw new Error("unmocked burn height");
    return this.opts.burnBlockHeight();
  }
}
