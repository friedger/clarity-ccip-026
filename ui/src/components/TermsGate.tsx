import { useState } from "react";
import { TERMS, useTerms } from "../lib/terms";

export function TermsGate() {
  const terms = useTerms();
  const [confirmed, setConfirmed] = useState(false);

  if (terms.accepted) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-tag">Before you continue · Miami</div>
        <h2>Terms &amp; conditions</h2>
        <p className="muted">
          This is an independent UI in front of an open-source Clarity
          contract. By using it you acknowledge:
        </p>
        <ul className="terms-list">
          {TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <label className="terms-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I have read the contract source and accept these terms.</span>
        </label>
        <div className="modal-actions">
          <a
            className="btn btn-ghost"
            href="https://github.com/citycoins/governance/blob/feat/add-ccip-026/ccips/ccip-026/ccip-026-miamicoin-burn-to-exit.md"
            target="_blank"
            rel="noreferrer"
          >
            Read the CCIP ↗
          </a>
          <button
            className="btn btn-primary"
            disabled={!confirmed}
            onClick={terms.accept}
          >
            Accept &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline reminder used on action cards to nudge unaccepted users. */
export function TermsNotice() {
  const terms = useTerms();
  if (terms.accepted) return null;
  return (
    <p className="warn small">
      Accept the terms (top of page) to enable signing.
    </p>
  );
}
