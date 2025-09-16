import { tx } from "@hirosystems/clarinet-sdk";
import { boolCV } from "@stacks/transactions";

export const vote = (sender: string, voteValue: boolean) => {
  return tx.callPublicFn(
    "ccip026-miamicoin-burn-to-exit",
    "vote-on-proposal",
    [boolCV(voteValue)],
    sender
  );
};
