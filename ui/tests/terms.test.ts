import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  key(i: number) {
    return Array.from(this.data.keys())[i] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

class FakeWindow {
  localStorage = new MemoryStorage();
  // EventTarget shim for the dispatchEvent calls inside terms.ts
  private listeners = new Map<string, Set<(e: Event) => void>>();
  addEventListener(name: string, fn: (e: Event) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: Event) => void) {
    this.listeners.get(name)?.delete(fn);
  }
  dispatchEvent(e: Event) {
    this.listeners.get(e.type)?.forEach((fn) => fn(e));
    return true;
  }
}

beforeEach(() => {
  vi.resetModules();
  const win = new FakeWindow();
  vi.stubGlobal("window", win);
  vi.stubGlobal("localStorage", win.localStorage);
  vi.stubGlobal("Event", class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  });
});

describe("terms", () => {
  it("starts unaccepted", async () => {
    const { hasAcceptedTerms } = await import("../src/lib/terms");
    expect(hasAcceptedTerms()).toBe(false);
  });

  it("acceptTerms persists across reads", async () => {
    const mod = await import("../src/lib/terms");
    expect(mod.hasAcceptedTerms()).toBe(false);
    mod.acceptTerms();
    expect(mod.hasAcceptedTerms()).toBe(true);
  });

  it("requireTermsAccepted throws when not accepted", async () => {
    const { requireTermsAccepted, TermsNotAcceptedError } = await import(
      "../src/lib/terms"
    );
    expect(() => requireTermsAccepted()).toThrow(TermsNotAcceptedError);
  });

  it("requireTermsAccepted is a no-op once accepted", async () => {
    const { acceptTerms, requireTermsAccepted } = await import(
      "../src/lib/terms"
    );
    acceptTerms();
    expect(() => requireTermsAccepted()).not.toThrow();
  });

  it("resetTerms clears the flag", async () => {
    const { acceptTerms, resetTerms, hasAcceptedTerms } = await import(
      "../src/lib/terms"
    );
    acceptTerms();
    resetTerms();
    expect(hasAcceptedTerms()).toBe(false);
  });

  it("exposes 4 plain-language terms", async () => {
    const { TERMS } = await import("../src/lib/terms");
    expect(TERMS).toHaveLength(4);
    expect(TERMS.join(" ").toLowerCase()).toContain("financial advice");
    expect(TERMS.join(" ").toLowerCase()).toContain("as is");
    expect(TERMS.join(" ").toLowerCase()).toContain("open-source");
  });
});
