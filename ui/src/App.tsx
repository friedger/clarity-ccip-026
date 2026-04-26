import { useEffect, useState } from "react";
import { Header, type Page } from "./components/Header";
import { TermsGate } from "./components/TermsGate";
import { VotePage } from "./pages/VotePage";
import { BurnExitPage } from "./pages/BurnExitPage";
import { HistoryPage } from "./pages/HistoryPage";
import { VerifyPage } from "./pages/VerifyPage";

function pageFromHash(): Page {
  switch (window.location.hash) {
    case "#/burn":
      return "burn";
    case "#/history":
      return "history";
    case "#/verify":
      return "verify";
    default:
      return "vote";
  }
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
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
