import { Cl, deserializeCV, cvToString, serializeCV } from "@stacks/transactions";

const API = process.env.HIRO_API_URL || "https://api.hiro.so";
const ADDR = "SP8A9HZ3PKST0S42VM9523Z9NV42SZ026V4K39WH";

function toHex(cv: ReturnType<typeof Cl.uint>): string {
  const h = serializeCV(cv as any);
  if (typeof h === "string") return h.startsWith("0x") ? h : "0x" + h;
  return "0x" + Array.from(new Uint8Array(h as any)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callReadOnly(contract: string, fn: string, args: any[], tip?: string) {
  let url = `${API}/v2/contracts/call-read/${ADDR}/${contract}/${fn}`;
  if (tip) url += `?tip=${tip}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "SP000000000000000000002Q6VF78", arguments: args.map(toHex) }),
  });
  const d = await r.json();
  if (!d.okay) throw new Error(JSON.stringify(d));
  return deserializeCV(d.result);
}

async function main() {
  // Who is user 23?
  const user = await callReadOnly("ccd003-user-registry", "get-user", [Cl.uint(23)]);
  console.log("User 23 address:", cvToString(user));

  const tip82 = "58514c712b83a0aca5c67dc2185eb1b1ada2e1a7f10669ca8150d8799b877e10";
  const tip83 = "52b3ab82e1849c39ebe740c87e352cbf92a26199f2a89047dae19421926337f9";

  console.log("\nUser 23 cycle 82 (tip=cycle82 hash):");
  const r82 = await callReadOnly("ccd007-citycoin-stacking", "get-stacker", [Cl.uint(1), Cl.uint(82), Cl.uint(23)], tip82);
  console.log(" ", cvToString(r82));

  console.log("User 23 cycle 83 (tip=cycle83 hash):");
  const r83 = await callReadOnly("ccd007-citycoin-stacking", "get-stacker", [Cl.uint(1), Cl.uint(83), Cl.uint(23)], tip83);
  console.log(" ", cvToString(r83));
}

main().catch(console.error);
