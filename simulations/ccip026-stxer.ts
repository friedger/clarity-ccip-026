import {
  AnchorMode,
  PostConditionMode,
  boolCV,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import { SimulationBuilder } from "stxer";
import fs from "fs";

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

function vote(sender: string, nonce: number) {
  return {
    contract_id,
    function_name: "vote-on-proposal",
    function_args: [boolCV(true)],
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

function main(block_height: number) {
  return (
    SimulationBuilder.new()
      .useBlockHeight(block_height)
      .addContractDeploy({
        contract_name: contract_name_redeem,
        source_code: fs.readFileSync(
          `./contracts/${contract_name_redeem}.clar`,
          "utf8"
        ),
        deployer,
      })
      .addContractDeploy({
        contract_name,
        source_code: fs.readFileSync(
          `./contracts/${contract_name}.clar`,
          "utf8"
        ),
        deployer,
      })
      .addContractCall(vote("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 74))
      .addContractCall(vote("SP1T91N2Y2TE5M937FE3R6DE0HGWD85SGCV50T95A", 249))
      .addContractCall(vote("SP18Z92ZT0GAB2JHD21CZ3KS1WPGNDJCYZS7CV3MD", 529))
      // execute
      .addContractCall(
        directExecute("SP7DGES13508FHRWS1FB0J3SZA326FP6QRMB6JDE", 124)
      )
      .addContractCall(
        directExecute("SP3YYGCGX1B62CYAH4QX7PQE63YXG7RDTXD8BQHJQ", 19)
      )
      .addContractCall(
        directExecute("SPN4Y5QPGQA8882ZXW90ADC2DHYXMSTN8VAR8C3X", 851)
      )

      // redeem
      .addContractCall(
        redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 75, 321_825_000000)
      )
      .addContractCall(
        // redeem more than user owns (0 MIA)
        redeem("SP39EH784WK8VYG0SXEVA0M81DGECRE25JYSZ5XSA", 76, 321_825_000000)
      )
      .addContractCall(
        // redeeem more than owned (10.08m MIA), redeem more than max per tx (10m MIA)
        redeem(
          "SP3BSWJTYBDJGDGZ54T4T0NMBGQ6BBFZCWD44VMH9",
          453,
          11_000_000_000000
        )
      )
      // redeem v1
      .addContractCall(
        redeem("SP22HP2QFA16AAP62HJWD85AKMYJ5AYRTH7TBT9MX", 10, 800_000_000000)
      )

      .run()
      .catch(console.error)
  );
}

const block_height_empty = 3425439;
const block_height_31k_stx = 3491155;

//main(block_height_empty).catch(console.error);
main(block_height_31k_stx).catch(console.error);
