import { useEffect, useState } from "react";

const STORAGE_KEY = "ccip026.tos.v1";

/** Bullet points displayed verbatim in the modal: the legal surface. */
export const TERMS = [
  "This UI is provided AS IS. No warranties, no guarantees of availability or correctness.",
  "Nothing here is financial advice. Do your own research.",
  "This UI never holds, custodies, or routes your assets. Every blockchain action is signed by you in your wallet.",
  "Every interaction is a direct call to an open-source Clarity contract on the Stacks blockchain. Read the source before you sign.",
] as const;

export interface TermsState {
  accepted: boolean;
  accept: () => void;
  reset: () => void;
}

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasAcceptedTerms(): boolean {
  return read();
}

export function acceptTerms(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetTerms(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const TERMS_EVENT = "ccip026:terms-changed";

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TERMS_EVENT));
  }
}

export function useTerms(): TermsState {
  const [accepted, setAccepted] = useState<boolean>(() => read());

  useEffect(() => {
    const handler = () => setAccepted(read());
    window.addEventListener(TERMS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(TERMS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    accepted,
    accept: () => {
      acceptTerms();
      emitChange();
      setAccepted(true);
    },
    reset: () => {
      resetTerms();
      emitChange();
      setAccepted(false);
    },
  };
}

/**
 * Throwing guard used by the wallet adapter. Pages should call useTerms()
 * separately to drive the UI; this is the last-mile defense in case a code
 * path forgets to check.
 */
export class TermsNotAcceptedError extends Error {
  constructor() {
    super("Accept the terms before signing transactions.");
    this.name = "TermsNotAcceptedError";
  }
}

export function requireTermsAccepted(): void {
  if (!read()) throw new TermsNotAcceptedError();
}
