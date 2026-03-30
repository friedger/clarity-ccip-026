import { tx } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";
import { vote as vote026 } from "./ccip026-miamicoin-burn-to-exit-client";

import { typedCallPublicFn } from "clarity-abitype/clarinet-sdk";
import { ccd001DirectExecuteAbi } from "../abis/abi-ccd001-direct-execute";
import { abiCcd013BurnToExitMia } from "../abis/abi-ccd013-burn-to-exit-mia";

export const directExecute = (
  sender: string,
  proposalContract: string = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
  proposalName: string = "ccip026-miamicoin-burn-to-exit",
) => {
  // The ABI provides static typing (see `DirectExecuteArgs`), at runtime we still pass the CVs expected by the SDK.
  return typedCallPublicFn({
    simnet,
    abi: ccd001DirectExecuteAbi,
    contract: "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute",
    functionName: "direct-execute",
    functionArgs: [`${proposalContract}.${proposalName}`],
    sender,
  });
};

export const vote = (sender: string) => {
  return vote026(sender, true);
};

export const redeem = (sender: string, amount: bigint) => {
  return typedCallPublicFn({
    simnet,
    abi: abiCcd013BurnToExitMia,
    contract: "ccd013-burn-to-exit-mia",
    functionName: "redeem-mia",
    functionArgs: [amount],
    sender,
  });
};

export const convertToV2 = (sender: string) => {
  return tx.callPublicFn(
    "SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2",
    "convert-to-v2",
    [],
    sender,
  );
};
