import { tx } from "@hirosystems/clarinet-sdk";
import { boolCV, contractPrincipalCV } from "@stacks/transactions";

export const vote = (sender: string) => {
  return tx.callPublicFn(
    "ccip026-miamicoin-burn-to-exit",
    "vote-on-proposal",
    [boolCV(true)],
    sender
  );
};

export const directExecute = (sender: string) => {
  return tx.callPublicFn(
    "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute",
    "direct-execute",
    [
      contractPrincipalCV(
        "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R",
        "ccip026-miamicoin-burn-to-exit"
      ),
    ],
    sender
  );
};
