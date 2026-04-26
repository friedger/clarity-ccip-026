import { shortAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";

export type Page = "vote" | "burn" | "history" | "verify";

interface Props {
  page: Page;
  onNav: (page: Page) => void;
}

export function Header({ page, onNav }: Props) {
  const wallet = useWallet();
  return (
    <header className="header">
      <div className="brand" onClick={() => onNav("vote")} role="button">
        <span className="brand-mark" aria-hidden>
          M
        </span>
        <span className="brand-text">
          CCIP-026<span className="brand-sub">South Beach Edition</span>
        </span>
      </div>
      <nav className="nav">
        <button
          className={page === "vote" ? "nav-link active" : "nav-link"}
          onClick={() => onNav("vote")}
        >
          Vote
        </button>
        <button
          className={page === "burn" ? "nav-link active" : "nav-link"}
          onClick={() => onNav("burn")}
        >
          Burn to Exit
        </button>
        <button
          className={page === "history" ? "nav-link active" : "nav-link"}
          onClick={() => onNav("history")}
        >
          History
        </button>
        <button
          className={page === "verify" ? "nav-link active" : "nav-link"}
          onClick={() => onNav("verify")}
        >
          Verify
        </button>
      </nav>
      <div className="wallet">
        {wallet.address ? (
          <button className="btn btn-ghost" onClick={wallet.disconnect}>
            {shortAddress(wallet.address)} · disconnect
          </button>
        ) : (
          <button className="btn btn-primary" onClick={wallet.connect}>
            Connect wallet
          </button>
        )}
      </div>
    </header>
  );
}
