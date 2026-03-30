import { typedCallPublicFn } from "clarity-abitype/clarinet-sdk";
import { abiCcip026MiamicoinBurnToExit } from "../abis/abi-ccip026-miamicoin-burn-to-exit";

export const vote = (sender: string, voteValue: boolean) => {
  return typedCallPublicFn({
    simnet,
    abi: abiCcip026MiamicoinBurnToExit,
    contract: "ccip026-miamicoin-burn-to-exit",
    functionName: "vote-on-proposal",
    functionArgs: [voteValue],
    sender,
  });
};
