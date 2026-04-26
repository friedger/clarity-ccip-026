import {
  connect,
  disconnect,
  getLocalStorage,
  isConnected,
  request,
} from "@stacks/connect";
import type { PostCondition } from "@stacks/transactions";
import { useEffect, useState } from "react";
import { STACKS_NETWORK } from "./config";
import { requireTermsAccepted } from "./terms";

export interface CallContractArgs {
  contract: `${string}.${string}`;
  functionName: string;
  /** Hex-serialized clarity values (with leading 0x). */
  functionArgs: string[];
  /** Structured post-conditions in stacks-transactions Pc-builder shape. */
  postConditions?: PostCondition[];
  postConditionMode?: "deny" | "allow";
}

/**
 * @stacks/connect v8 accepts post-conditions as plain objects (the same
 * shape produced by Pc.principal(...)... in @stacks/transactions 7+). This
 * helper exists for tests that want to assert the round-trip is a no-op.
 */
export function preparePostConditions(pcs: PostCondition[]): PostCondition[] {
  return pcs;
}

export interface CallContractResult {
  txid: string;
}

/** Abstraction over the user's wallet. Inject a fake adapter in tests. */
export interface WalletAdapter {
  getAddress(): string | null;
  connect(): Promise<string | null>;
  disconnect(): void;
  callContract(args: CallContractArgs): Promise<CallContractResult>;
}

export class StacksConnectAdapter implements WalletAdapter {
  getAddress(): string | null {
    if (!isConnected()) return null;
    const data = getLocalStorage();
    return data?.addresses?.stx?.[0]?.address ?? null;
  }

  async connect(): Promise<string | null> {
    await connect();
    return this.getAddress();
  }

  disconnect(): void {
    disconnect();
  }

  async callContract(args: CallContractArgs): Promise<CallContractResult> {
    requireTermsAccepted();
    const result = (await request("stx_callContract", {
      contract: args.contract,
      functionName: args.functionName,
      functionArgs: args.functionArgs,
      network: STACKS_NETWORK,
      postConditions: (args.postConditions ?? []) as never,
      postConditionMode: args.postConditionMode ?? "deny",
    })) as { txid?: string };
    return { txid: result.txid ?? "" };
  }
}

let walletAdapter: WalletAdapter = new StacksConnectAdapter();
export function getWallet(): WalletAdapter {
  return walletAdapter;
}
export function setWallet(adapter: WalletAdapter): void {
  walletAdapter = adapter;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(() =>
    walletAdapter.getAddress(),
  );

  useEffect(() => {
    const handler = () => setAddress(walletAdapter.getAddress());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  return {
    address,
    connect: async () => {
      const a = await walletAdapter.connect();
      setAddress(a);
    },
    disconnect: () => {
      walletAdapter.disconnect();
      setAddress(null);
    },
  };
}

/** Compatibility shim used by existing pages. */
export async function callContract(
  args: CallContractArgs,
): Promise<CallContractResult> {
  return walletAdapter.callContract(args);
}
