import {
  AnchorMode,
  PostConditionMode,
  boolCV,
  bufferCV,
  listCV,
  principalCV,
  tupleCV,
  uintCV,
} from "@stacks/transactions";
import { SimulationBuilder } from "stxer";
import fs from "fs";
import { stackingData } from "../data/stacking-data";
import { scaledVoteFromCycles } from "../data/scaled-vote";
import { buildMerkleTree, type VoterEntry } from "../tests/merkle-helpers";

const contract_name = "ccip026-miamicoin-burn-to-exit";
const contract_name_redeem = "ccd013-burn-to-exit-mia";
const deployer = "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9";
const contract_id = `${deployer}.${contract_name}`;
const common_params = {
  publicKey: "",
  postConditionMode: PostConditionMode.Allow,
  anchorMode: AnchorMode.Any,
  fee: 100,
};

// Build Merkle tree from stacking data
const voters: VoterEntry[] = stackingData
  .map((entry) => ({
    address: entry.address,
    scaledVote: scaledVoteFromCycles(
      entry.cycle82Stacked,
      entry.cycle83Stacked,
    ),
  }))
  .filter(({ scaledVote }) => scaledVote > 0n);
const { proofs } = buildMerkleTree(voters);

function getVoterProof(address: string) {
  const idx = voters.findIndex((v) => v.address === address);
  if (idx === -1) return null;
  return {
    scaledVote: voters[idx].scaledVote,
    proof: proofs[idx].proof,
    positions: proofs[idx].positions,
  };
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function vote(
  sender: string,
  nonce: number,
  scaledMiaVoteAmount: bigint,
  proof: string[],
  positions: boolean[],
) {
  return {
    contract_id,
    function_name: "vote-on-proposal",
    function_args: [
      boolCV(true),
      uintCV(scaledMiaVoteAmount),
      listCV(proof.map((h) => bufferCV(fromHex(h)))),
      listCV(positions.map((p) => boolCV(p))),
    ],
    nonce: nonce++,
    sender,
    ...common_params,
  };
}

function directExecute(sender: string, nonce: number) {
  return {
    contract_id:
      "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd001-direct-execute",
    function_name: "direct-execute",
    function_args: [principalCV(contract_id)],
    nonce: nonce++,
    sender,
    ...common_params,
  };
}

function redeem(sender: string, nonce: number, amount: number) {
  return {
    contract_id: `${deployer}.${contract_name_redeem}`,
    function_name: "redeem-mia",
    function_args: [uintCV(amount)],
    nonce: nonce++,
    sender,
    ...common_params,
  };
}

function convertToV2(sender: string, nonce: number) {
  return {
    contract_id: `SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2`,
    function_name: "convert-to-v2",
    function_args: [],
    nonce: nonce++,
    sender,
    ...common_params,
  };
}

const voterA = getVoterProof("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA")!;
const voterB = getVoterProof("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A")!;

function main(block_height: number) {
  return (
    SimulationBuilder.new()
      //.useBlockHeight(block_height)
      .addContractCall(
        vote(
          "SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA",
          74,
          voterA.scaledVote,
          voterA.proof,
          voterA.positions,
        ),
      )
      .addContractCall(
        vote(
          "SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A",
          249,
          voterB.scaledVote,
          voterB.proof,
          voterB.positions,
        ),
      )
      .addContractCall(
        // not in Merkle tree — expected to fail with ERR_PROOF_INVALID
        vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", 529, 0n, [], []),
      )
      // execute
      .addContractCall(
        directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE", 124),
      )
      .addContractCall(
        directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ", 19),
      )
      .addContractCall(
        directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X", 851),
      )
      .addContractCall({
        contract_id: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.send-many",
        function_name: "send-many",
        function_args: [
          listCV([
            tupleCV({
              to: principalCV(
                "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH.ccd002-treasury-mia-rewards-v3",
              ),
              ustx: uintCV(2000_000000),
            }),
          ]),
        ],
        sender: "SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045",
      })
      // redeem
      .addContractCall(
        redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 75, 321_825_000000),
      )
      .addContractCall(
        // redeem more than user owns (0 MIA)
        redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 76, 321_825_000000),
      )
      // redeem v1
      .addContractCall(
        redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", 10, 800_000_000000),
      )
      .addContractCall(
        // redeeem more than owned (10.08m MIA), redeem more than max per tx (10m MIA)
        redeem(
          "SP3BSWJTYBDJGDGZ54T4T0NMBGQ6BBFZCWD44VMH9",
          453,
          11_000_000_000000,
        ),
      )

      .run()
      .catch(console.error)
  );
}

// epoch 3.4 start: 7444340
main(7444340).catch(console.error);
