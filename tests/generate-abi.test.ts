import { describe, it } from "vitest";
import * as fs from "fs";

function toCamelCase(input: string): string {
  return input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
}

function writeAbi(abi: Map<string, any>, name: string) {
  const variableName = toCamelCase(`abi-${name}`);
  fs.writeFileSync(
    `tests/abis/abi-${name}.ts`,
    `export const ${variableName} = ${JSON.stringify(abi.get(`SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R.${name}`), null, 2)} as const;
`,
  );
}

describe("ABI generation", () => {
  it("should generate ABI for all contracts", () => {
    const abi: Map<string, any> = simnet.getContractsInterfaces();
    // write interface to file
    writeAbi(abi, "ccd013-burn-to-exit-mia");
    writeAbi(abi, "ccip026-miamicoin-burn-to-exit");
  });
});
