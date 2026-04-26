import { useEffect, useMemo, useState } from "react";
import { Cl, serializeCV } from "@stacks/transactions";
import { Stat } from "../components/Stat";
import { TermsNotice } from "../components/TermsGate";
import { CCIP_026, SNAPSHOT_MERKLE_ROOT } from "../lib/config";
import {
  computeYesShare,
  type ProposalInfo,
  type VotePeriod,
  type VoteTotals,
} from "../lib/contracts";
import { formatUMia, shortAddress } from "../lib/format";
import { getCcip026, getReadOnlyClient } from "../lib/services";
import { findVoter, getProofFor, getSnapshot } from "../lib/snapshot";
import { approxDuration, deriveVotePeriod } from "../lib/votePeriod";
import { callContract, useWallet } from "../lib/wallet";

export function VotePage() {
  const wallet = useWallet();
  const [info, setInfo] = useState<ProposalInfo | null>(null);
  const [period, setPeriod] = useState<VotePeriod | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [totals, setTotals] = useState<VoteTotals | null>(null);
  const [burnHeight, setBurnHeight] = useState<number | null>(null);
  const [voterRecord, setVoterRecord] = useState<{
    vote: boolean;
    mia: bigint;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

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
  void localRoot;

  const voterRow = wallet.address ? findVoter(wallet.address) : undefined;
  const proof = wallet.address ? getProofFor(wallet.address) : undefined;

  useEffect(() => {
    let cancelled = false;
    const svc = getCcip026();
    const client = getReadOnlyClient();
    (async () => {
      try {
        const [i, p, a, t, h] = await Promise.all([
          svc.getProposalInfo().catch(() => null),
          svc.getVotePeriod().catch(() => null),
          svc.isVoteActive().catch(() => null),
          svc.getVoteTotals().catch(
            () => ({ yesAmount: 0n, noAmount: 0n, yesCount: 0, noCount: 0 }),
          ),
          client.fetchBurnBlockHeight().catch(() => null),
        ]);
        if (cancelled) return;
        setInfo(i);
        setPeriod(p);
        setActive(a);
        setTotals(t);
        setBurnHeight(h);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet.address) {
      setVoterRecord(null);
      return;
    }
    const svc = getCcip026();
    (async () => {
      try {
        const id = await svc.getUserId(wallet.address!);
        if (id == null) return;
        const v = await svc.getVoterInfo(id);
        if (v) setVoterRecord(v);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [wallet.address]);

  const yesPct = totals ? computeYesShare(totals) : 0;
  const totalAmount = totals ? totals.yesAmount + totals.noAmount : 0n;
  const periodView = deriveVotePeriod(period, active, burnHeight);

  async function vote(choice: boolean) {
    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    setErr(null);
    setTxid(null);
    if (!CCIP_026.address) {
      setErr("Deployer address not configured. Set VITE_CCIP_DEPLOYER.");
      return;
    }
    if (!proof || !voterRow) {
      setErr("Your address is not in the snapshot. You cannot vote.");
      return;
    }
    setBusy(true);
    try {
      const args = [
        Cl.bool(choice),
        Cl.uint(voterRow.scaledVote),
        Cl.list(proof.proof.map((p) => Cl.bufferFromHex(p))),
        Cl.list(proof.positions.map((b) => Cl.bool(b))),
      ];
      const result = await callContract({
        contract: `${CCIP_026.address}.${CCIP_026.name}`,
        functionName: "vote-on-proposal",
        functionArgs: args.map((a) => `0x${serializeCV(a)}`),
      });
      if (result.txid) setTxid(result.txid);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-tag">Proposal · Miami</div>
        <h1>{info?.name ?? "MiamiCoin Burn to Exit"}</h1>
        <p className="hero-lede">
          This is a proposal to let MIA holders who want to exit redeem tokens for a
          proportional share of the rewards treasury. Voting is enabled for MIA stackers 
          across cycles 82 and 83 through a Merkle snapshot.
        </p>
        <div className="hero-meta">
          {info?.link && (
            <a className="link" href={info.link} target="_blank" rel="noreferrer">
              Read full CCIP ↗
            </a>
          )}
          {info?.hash && <span className="mono dim">hash {info.hash}</span>}
        </div>
      </section>

      <section className="grid stats-grid">
        <Stat
          label="Yes amount (MIA)"
          value={formatUMia(totals?.yesAmount ?? 0n, 0)}
          hint={`${totals?.yesCount ?? 0} voter${(totals?.yesCount ?? 0) === 1 ? "" : "s"}`}
          tone="yes"
        />
        <Stat
          label="No amount (MIA)"
          value={formatUMia(totals?.noAmount ?? 0n, 0)}
          hint={`${totals?.noCount ?? 0} voter${(totals?.noCount ?? 0) === 1 ? "" : "s"}`}
          tone="no"
        />
        <Stat
          label="Status"
          value={periodView.label}
          hint={
            period
              ? `BTC ${period.startBlock.toString()} to ${period.endBlock.toString()}`
              : undefined
          }
        />
        <Stat label="Yes share" value={`${yesPct.toFixed(2)}%`} />
      </section>

      {totalAmount > 0n && (
        <div className="bar">
          <div className="bar-yes" style={{ width: `${yesPct}%` }} />
          <div className="bar-no" style={{ width: `${100 - yesPct}%` }} />
        </div>
      )}

      {period && (
        <section className="period">
          <div className="period-head">
            <span className="period-label">Voting period</span>
            <span className="period-meta">
              {periodView.status === "open" && (
                <>
                  {periodView.blocksRemaining} blocks remaining (~
                  {approxDuration(periodView.blocksRemaining)})
                </>
              )}
              {periodView.status === "scheduled" && (
                <>
                  Opens in {periodView.blocksRemaining} blocks (~
                  {approxDuration(periodView.blocksRemaining)})
                </>
              )}
              {periodView.status === "ended_pending_execution" && (
                <>Window closed; awaiting DAO execution</>
              )}
              {periodView.status === "executed" && <>Proposal executed</>}
              {periodView.status === "loading" && <>Reading chain state</>}
            </span>
          </div>
          <div
            className="period-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(periodView.progressPct)}
          >
            <div
              className="period-bar-fill"
              style={{ width: `${periodView.progressPct}%` }}
            />
          </div>
          <div className="period-foot">
            <span>
              Start{" "}
              <code className="mono">{period.startBlock.toString()}</code>
            </span>
            <span className="dim">
              {burnHeight != null && (
                <>
                  Now <code className="mono">{burnHeight}</code>
                </>
              )}
            </span>
            <span>
              End <code className="mono">{period.endBlock.toString()}</code>
            </span>
          </div>
        </section>
      )}

      <section className="grid two-col">
        <div className="card">
          <h2>Cast your vote</h2>
          {!wallet.address && (
            <>
              <p className="muted">
                Connect a Stacks wallet that controlled MIA stacking during
                cycles 82 or 83 to vote.
              </p>
              <div className="kv">
                <div>Eligible voters in snapshot</div>
                <strong>{snapshot ? snapshot.voters.length : "..."}</strong>
              </div>
              <div className="kv">
                <div>Total voting power</div>
                <strong>
                  {snapshot
                    ? `${formatUMia(
                        snapshot.voters.reduce(
                          (s, v) => s + v.averageStacked,
                          0n,
                        ),
                        0,
                      )} MIA`
                    : "..."}
                </strong>
              </div>
              <div className="kv">
                <div>Snapshot root match</div>
                <strong>{rootMatches ? "✓ verified" : "✗ mismatch"}</strong>
              </div>
              <button
                className="btn btn-primary full"
                onClick={wallet.connect}
              >
                Connect wallet
              </button>
            </>
          )}
          {wallet.address && !voterRow && (
            <p className="warn">
              {shortAddress(wallet.address)} is not in the snapshot. Only
              MIA stackers from cycles 82 to 83 can vote.
            </p>
          )}
          {wallet.address && voterRow && (
            <>
              <div className="kv">
                <div>Your voting power</div>
                <strong>{formatUMia(voterRow.averageStacked, 2)} MIA</strong>
              </div>
              {voterRecord && (
                <div className="kv">
                  <div>Already voted</div>
                  <strong>
                    {voterRecord.vote ? "YES" : "NO"} ·{" "}
                    {formatUMia(voterRecord.mia * 1_000_000n, 0)} MIA
                  </strong>
                </div>
              )}
              <div className="vote-buttons">
                <button
                  className="btn btn-yes"
                  disabled={
                    busy || active === false || voterRecord?.vote === true
                  }
                  onClick={() => vote(true)}
                >
                  {voterRecord?.vote === false ? "Change to YES" : "Vote YES"}
                </button>
                <button
                  className="btn btn-no"
                  disabled={
                    busy || active === false || voterRecord?.vote === false
                  }
                  onClick={() => vote(false)}
                >
                  {voterRecord?.vote === true ? "Change to NO" : "Vote NO"}
                </button>
              </div>
              <TermsNotice />
              {err && <p className="error">{err}</p>}
              {txid && (
                <p className="success">
                  Submitted ·{" "}
                  <a
                    className="link"
                    href={`https://explorer.hiro.so/txid/${txid}?chain=mainnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(txid, 10, 6)}
                  </a>
                </p>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2>What happens if it passes</h2>
          <ul className="list">
            <li>
              The DAO enables the <code>ccd013-burn-to-exit-mia</code>{" "}
              extension.
            </li>
            <li>
              Stacking delegation on the MIA rewards treasury is{" "}
              <strong>revoked</strong>; STX becomes redeemable. The MIA mining treasury
              is unaffected and remains stacked.
            </li>
            <li>
              Redemption ratio is locked at{" "}
              <code>treasuryBalance · 10⁶ ÷ totalSupply</code>.
            </li>
            <li>
              MIA holders can burn v1/v2 tokens for STX, capped at 10M MIA per
              tx.
            </li>
          </ul>
        </div>
      </section>

      <p className="page-foot">
        Independently verify the snapshot, your proof, and the proposal hash on
        the <a href="#/verify" className="link">Verify page</a>.
      </p>
    </main>
  );
}
