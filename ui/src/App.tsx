import { useEffect, useState } from "react";
import { Header, type Page } from "./components/Header";
import { TermsGate } from "./components/TermsGate";
import { VotePage } from "./pages/VotePage";
import { BurnExitPage } from "./pages/BurnExitPage";
import { HistoryPage } from "./pages/HistoryPage";
import { VerifyPage } from "./pages/VerifyPage";
import { getCcip026 } from "./lib/services";

/**
 * Returns the page from the URL hash, or null when the hash is empty —
 * empty means "use the dynamic default" (vote while the window is open,
 * burn after it closes).
 */
function pageFromHash(): Page | null {
  switch (window.location.hash) {
    case "#/vote":
      return "vote";
    case "#/burn":
      return "burn";
    case "#/history":
      return "history";
    case "#/verify":
      return "verify";
    default:
      return null;
  }
}

export default function App() {
  // Show "vote" while we wait for the chain read; the page itself renders
  // a loading state until totals/period arrive, so this is harmless.
  const [page, setPage] = useState<Page>(() => pageFromHash() ?? "vote");

  useEffect(() => {
    // Resolve the dynamic default exactly once at boot, when the user
    // landed without an explicit hash. After that, hash navigation drives
    // the page state.
    if (pageFromHash() != null) return;
    let cancelled = false;
    (async () => {
      const active = await getCcip026()
        .isVoteActive()
        .catch(() => null);
      if (cancelled) return;
      if (pageFromHash() != null) return;
      setPage(active === false ? "burn" : "vote");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHash = () => {
      const p = pageFromHash();
      if (p != null) setPage(p);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function nav(p: Page) {
    window.location.hash = `#/${p}`;
    setPage(p);
  }

  return (
    <div className="app">
      <Header page={page} onNav={nav} />
      {page === "vote" && <VotePage />}
      {page === "burn" && <BurnExitPage />}
      {page === "history" && <HistoryPage />}
      {page === "verify" && <VerifyPage />}
      <footer className="footer">
        <span>CCIP-026 · MiamiCoin Burn to Exit</span>
        <span>
          <a
            className="link"
            href="https://github.com/friedger/clarity-ccip-026"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
          {" · "}
          <a
            className="link"
            href="https://github.com/friedger/clarity-ccip-026/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            Report an issue
          </a>
        </span>
        <span>{new Date().getFullYear()} · Stacks Mainnet</span>
      </footer>
      <TermsGate />
    </div>
  );
}
