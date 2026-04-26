import { describe, expect, it } from "vitest";
import { buildRedemptionAtom } from "../src/lib/rss";
import type { RedemptionEvent } from "../src/lib/history";

const event: RedemptionEvent = {
  txid: "0xabc123",
  blockHeight: 200,
  burnBlockTime: 1_700_000_000,
  sender: "SP_ALICE",
  burnUmia: 11_500_000n,
  burnV1Mia: 10n,
  burnV2Umia: 1_500_000n,
  redemptionUstx: 2300n,
};

describe("buildRedemptionAtom", () => {
  it("emits a valid Atom envelope", () => {
    const xml = buildRedemptionAtom([event], {
      origin: "https://example.com",
      updated: new Date("2026-01-01T00:00:00Z"),
    });
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\">");
    expect(xml).toContain("</feed>");
    expect(xml).toContain("<updated>2026-01-01T00:00:00.000Z</updated>");
  });

  it("emits one <entry> per event", () => {
    const second = { ...event, txid: "0xdef456", sender: "SP_BOB" };
    const xml = buildRedemptionAtom([event, second], {
      origin: "https://example.com",
    });
    const matches = xml.match(/<entry>/g);
    expect(matches?.length).toBe(2);
    expect(xml).toContain("urn:stacks:tx:0xabc123");
    expect(xml).toContain("urn:stacks:tx:0xdef456");
  });

  it("links to the Hiro explorer for each tx", () => {
    const xml = buildRedemptionAtom([event], {
      origin: "https://example.com",
    });
    expect(xml).toContain(
      "https://explorer.hiro.so/txid/0xabc123?chain=mainnet",
    );
  });

  it("orders entries newest-first", () => {
    const older = { ...event, txid: "0x1", burnBlockTime: 1000 };
    const newer = { ...event, txid: "0x2", burnBlockTime: 2000 };
    const xml = buildRedemptionAtom([older, newer], {
      origin: "https://example.com",
    });
    expect(xml.indexOf("urn:stacks:tx:0x2")).toBeLessThan(
      xml.indexOf("urn:stacks:tx:0x1"),
    );
  });

  it("escapes XML-unsafe characters", () => {
    const dirty = { ...event, sender: "<scr&ipt>'\"" };
    const xml = buildRedemptionAtom([dirty], {
      origin: "https://example.com",
    });
    expect(xml).not.toContain("<scr&ipt>");
    expect(xml).toContain("&lt;scr&amp;ipt&gt;");
    expect(xml).toContain("&apos;");
    expect(xml).toContain("&quot;");
  });

  it("produces an empty (but valid) feed when there are no events", () => {
    const xml = buildRedemptionAtom([], {
      origin: "https://example.com",
      updated: new Date("2026-01-01T00:00:00Z"),
    });
    expect(xml).toContain("<feed");
    expect(xml).toContain("</feed>");
    expect(xml.match(/<entry>/g)).toBeNull();
  });
});
