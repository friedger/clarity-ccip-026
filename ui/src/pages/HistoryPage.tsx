import { useEffect, useState } from "react";
import { Stat } from "../components/Stat";
import { CCD013 } from "../lib/config";
import { formatUMia, formatUStx, shortAddress } from "../lib/format";
import { formatTimestamp, type RedemptionEvent } from "../lib/history";
import { buildRedemptionAtom, downloadAtom } from "../lib/rss";
import { getHistory } from "../lib/services";
import { useWallet } from "../lib/wallet";

type Filter = "mine" | "all";

export function HistoryPage() {
  const wallet = useWallet();
  const [filter, setFilter] = useState<Filter>(wallet.address ? "mine" : "all");
  const [events, setEvents] = useState<RedemptionEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (filter === "mine" && !wallet.address) setFilter("all");
  }, [wallet.address, filter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const list = await getHistory().list({
          sender: filter === "mine" ? wallet.address ?? undefined : undefined,
        });
        if (!cancelled) setEvents(list);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, wallet.address]);

  const totalUmia = (events ?? []).reduce(
    (s, e) => s + e.burnUmia,
    0n,
  );
  const totalUstx = (events ?? []).reduce(
    (s, e) => s + e.redemptionUstx,
    0n,
  );

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-tag">History · Miami</div>
        <h1>Redemption history</h1>
        <p className="hero-lede">
          Every burn-and-redeem call to{" "}
          <code>{CCD013.name}</code>, parsed from the on-chain{" "}
          <code>user-redemption</code> print events. Filter by your wallet or
          view the full ledger.
        </p>
      </section>

      <section className="grid stats-grid">
        <Stat
          label="Showing"
          value={events ? events.length.toString() : "..."}
          hint={filter === "mine" ? "your redemptions" : "all redemptions"}
        />
        <Stat
          label="MIA burnt"
          value={events ? formatUMia(totalUmia, 0) : "..."}
          tone="warn"
        />
        <Stat
          label="STX received"
          value={events ? formatUStx(totalUstx) : "..."}
          tone="yes"
        />
        <Stat
          label="Filter"
          value={filter === "mine" ? "Mine" : "All"}
          hint={
            wallet.address ? shortAddress(wallet.address) : "connect to filter"
          }
        />
      </section>

      <div className="filter-row">
        <div className="filter-bar">
          <button
            className={
              filter === "mine" ? "nav-link active" : "nav-link"
            }
            onClick={() => setFilter("mine")}
            disabled={!wallet.address}
          >
            My redemptions
          </button>
          <button
            className={filter === "all" ? "nav-link active" : "nav-link"}
            onClick={() => setFilter("all")}
          >
            All redemptions
          </button>
        </div>
        <button
          className="btn btn-ghost"
          disabled={!events || events.length === 0}
          onClick={() => {
            if (!events) return;
            const xml = buildRedemptionAtom(events, {
              origin: window.location.origin,
            });
            downloadAtom(xml);
          }}
          title="Download an Atom 1.0 feed of the displayed redemptions"
        >
          Download RSS feed
        </button>
      </div>

      <div className="card">
        {loading && <p className="muted">Loading from Hiro API…</p>}
        {err && <p className="error">{err}</p>}
        {!loading && events && events.length === 0 && (
          <p className="muted">
            {filter === "mine"
              ? "No redemptions yet for this address."
              : "No redemptions yet."}
          </p>
        )}
        {!loading && events && events.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>From</th>
                  <th className="num">Burnt</th>
                  <th className="num">v1 / v2</th>
                  <th className="num">STX out</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.txid}>
                    <td className="dim small">
                      {formatTimestamp(e.burnBlockTime)}
                      <div className="mono dim small">#{e.blockHeight}</div>
                    </td>
                    <td className="mono">
                      {wallet.address === e.sender ? (
                        <strong>{shortAddress(e.sender)}</strong>
                      ) : (
                        shortAddress(e.sender)
                      )}
                    </td>
                    <td className="num">
                      {formatUMia(e.burnUmia, 2)}
                      <div className="dim small">MIA</div>
                    </td>
                    <td className="num small dim">
                      {e.burnV1Mia.toString()} ·{" "}
                      {formatUMia(e.burnV2Umia, 2)}
                    </td>
                    <td className="num">
                      {formatUStx(e.redemptionUstx)}
                      <div className="dim small">STX</div>
                    </td>
                    <td>
                      <a
                        className="link mono small"
                        href={`https://explorer.hiro.so/txid/${e.txid}?chain=mainnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortAddress(e.txid, 8, 6)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="page-foot">
        Source data and parsing details on the{" "}
        <a href="#/verify" className="link">Verify page</a>.
      </p>
    </main>
  );
}
