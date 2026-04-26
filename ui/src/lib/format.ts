import { MICRO_CITYCOINS } from "./config";

const STX_DECIMALS = 6;

export function formatUStx(ustx: bigint, fractionDigits = 2): string {
  return formatMicro(ustx, STX_DECIMALS, fractionDigits);
}

export function formatUMia(umia: bigint, fractionDigits = 2): string {
  return formatMicro(umia, 6, fractionDigits);
}

function formatMicro(value: bigint, decimals: number, fractionDigits: number): string {
  const factor = 10n ** BigInt(decimals);
  const whole = value / factor;
  const frac = value % factor;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, fractionDigits);
  const wholeStr = formatThousands(whole);
  return fractionDigits === 0 ? wholeStr : `${wholeStr}.${fracStr}`;
}

function formatThousands(n: bigint): string {
  const sign = n < 0n ? "-" : "";
  const digits = (n < 0n ? -n : n).toString();
  const out: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    out.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return sign + out.join(",");
}

export function shortAddress(addr: string, head = 5, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function miaFromUmia(umia: bigint): bigint {
  return umia / MICRO_CITYCOINS;
}

const STX_FACTOR = 10n ** 6n;

/**
 * Parse a decimal STX string (e.g. "12.345") into uSTX (bigint, 6 decimals).
 * Returns null on invalid input. Trims internal commas and surrounding spaces.
 */
export function parseStxToUstx(input: string): bigint | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(?:\.\d{0,6})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * STX_FACTOR + BigInt(fracPadded);
}

/**
 * Format uSTX as a plain decimal STX string (no thousands separators) suitable
 * for prefilling an input. Trims trailing zeros after the decimal point.
 */
export function formatUstxAsStxInput(ustx: bigint): string {
  if (ustx <= 0n) return "0";
  const whole = ustx / STX_FACTOR;
  const frac = ustx % STX_FACTOR;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
