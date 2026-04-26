import { useMemo } from "react";
import {
  CCD013,
  CCIP_026,
  MIA_REWARDS_TREASURY,
  SNAPSHOT_MERKLE_ROOT,
} from "../lib/config";
import { TERMS } from "../lib/terms";
import { getSnapshot } from "../lib/snapshot";

interface Step {
  label: string;
  detail: string;
  code?: string;
}

interface Section {
  title: string;
  intro: string;
  steps: Step[];
}

export function VerifyPage() {
  const snapshot = useMemo(() => {
    try {
      return getSnapshot();
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  const localRoot = snapshot?.root;
  const rootMatches =
    !!localRoot &&
    localRoot.toLowerCase() === SNAPSHOT_MERKLE_ROOT.toLowerCase();

  const sections: Section[] = [
    {
      title: "Snapshot & vote integrity",
      intro:
        "Voting power is committed to a Merkle tree built from cycle 82 and 83 stacking data. The contract verifies your proof against an immutable root.",
      steps: [
        {
          label: "Re-derive the Merkle root locally",
          detail:
            "The voter snapshot in /data/stacking-data.ts is hashed in your browser using @noble/hashes. The computed root must match the on-chain constant.",
          code: `local    ${localRoot ?? "(loading)"}
on-chain ${SNAPSHOT_MERKLE_ROOT}
match    ${rootMatches ? "✓" : "✗"}`,
        },
        {
          label: "Inspect stacking data on-chain",
          detail:
            "Each (address, average) row was pulled from ccd007-citycoin-stacking.get-stacker for cycles 82 and 83. Re-run simulations/fetch-stacking-data.ts to reproduce the file from mainnet.",
        },
        {
          label: "Verify your own leaf",
          detail:
            "Your scaled vote, proof, and positions are passed verbatim to vote-on-proposal. The contract recomputes the leaf with tagged SHA-256 and folds the proof against the on-chain root.",
        },
        {
          label: "Cross-check the proposal hash",
          detail:
            "The on-chain hash field commits to the CCIP markdown at the linked GitHub commit. Diff it against the URL in the contract before voting.",
        },
      ],
    },
    {
      title: "Redemption math & state",
      intro:
        "The redemption ratio is sealed once at initialization and never updated. Every redemption is verifiable from chain state alone.",
      steps: [
        {
          label: "Confirm the ratio is sealed",
          detail:
            "redemption-ratio is set once in initialize-redemption and never updated. Read it directly from the contract.",
          code: `ratio = floor(treasuryAtInit · 10⁶ / totalSupply)`,
        },
        {
          label: "Recompute your STX payout",
          detail:
            "uSTX = floor(ratio · uMIA / 10⁶). The contract caps to live treasury balance if you'd otherwise drain it; the displayed Burn amounts then reflect what's actually burnable.",
        },
        {
          label: "Verify the treasury balance",
          detail:
            "The 'Treasury STX (live)' stat is fetched from /v2/accounts on the rewards treasury contract; it decreases as redemptions land. Cross-check on the explorer.",
          code: `https://explorer.hiro.so/address/${MIA_REWARDS_TREASURY.address}.${MIA_REWARDS_TREASURY.name}?chain=mainnet`,
        },
        {
          label: "Verify the burn split",
          detail:
            "Burn v1 (whole MIA) is taken first. Remainder is taken from v2 (uMIA). The contract asserts v1·10⁶ + v2 = total before any token call.",
        },
        {
          label: "Read the post-conditions before signing",
          detail:
            "redeem-mia is submitted in DENY mode with three strict post-conditions: tx-sender willSendLte burnV1Mia · tx-sender willSendLte burnV2Umia · treasury willSendGte redemptionUstx. Your wallet displays them; confirm they match the preview.",
        },
      ],
    },
    {
      title: "History is parsed, not stored",
      intro:
        "The History page is rebuilt from on-chain events on every load. There is no off-chain database.",
      steps: [
        {
          label: "Source: Hiro extended API",
          detail:
            "Transactions are fetched directly from Hiro's public API and filtered to redeem-mia calls. You can hit the same URL.",
          code: `/extended/v1/address/${CCD013.address || "<deployer>"}.${CCD013.name}/transactions`,
        },
        {
          label: "Amounts come from the print event",
          detail:
            "redeem-mia emits a 'user-redemption' print with burn-amount-umia, burn-amount-v1-mia, burn-amount-v2-umia, redemption-amount-ustx. We parse those four fields from the event repr.",
        },
        {
          label: "Independent confirmation",
          detail:
            "Click any txid to open the explorer; the ledger lists STX transfers + token burn events that must add up to the values shown.",
        },
      ],
    },
  ];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-tag">Verification</div>
        <h1>Trust nothing. Verify everything.</h1>
        <p className="hero-lede">
          This UI never holds assets and never asks you to trust it. Below is
          how to independently confirm every number it shows you and every
          transaction it asks you to sign.
        </p>
      </section>

      <section className="terms-section">
        <h2 className="section-h">Terms in effect</h2>
        <ol className="terms-list-plain">
          {TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </section>

      {sections.map((s) => (
        <section key={s.title} className="verify-section">
          <h2 className="section-h">{s.title}</h2>
          <p className="muted">{s.intro}</p>
          <ol className="verify-list-plain">
            {s.steps.map((step, i) => (
              <li key={i}>
                <div className="verify-step-head">
                  <span className="verify-step-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="verify-step-label">{step.label}</span>
                </div>
                <p className="verify-step-detail">{step.detail}</p>
                {step.code && <pre className="verify-code">{step.code}</pre>}
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="verify-section">
        <h2 className="section-h">Contract source</h2>
        <p className="muted">Read the Clarity. Everything else is downstream.</p>
        <div className="contract-list">
          <a
            className="link"
            href={`https://explorer.hiro.so/txid/${CCIP_026.address || "<deployer>"}.${CCIP_026.name}?chain=mainnet`}
            target="_blank"
            rel="noreferrer"
          >
            ccip026-miamicoin-burn-to-exit ↗
          </a>
          <a
            className="link"
            href={`https://explorer.hiro.so/txid/${CCD013.address || "<deployer>"}.${CCD013.name}?chain=mainnet`}
            target="_blank"
            rel="noreferrer"
          >
            ccd013-burn-to-exit-mia ↗
          </a>
        </div>
      </section>
    </main>
  );
}
