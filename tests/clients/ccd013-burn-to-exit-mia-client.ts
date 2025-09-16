import { tx } from "@hirosystems/clarinet-sdk";
import { boolCV, contractPrincipalCV, uintCV } from "@stacks/transactions";

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

export const redeem = (sender: string, amount: number) => {
  return tx.callPublicFn(
    "ccd013-burn-to-exit-mia",
    "redeem-mia",
    [uintCV(amount)],
    sender
  );
};

export const convertToV2 = (sender: string) => {
  return tx.callPublicFn(
    "SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2",
    "convert-to-v2",
    [],
    sender
  );
};
